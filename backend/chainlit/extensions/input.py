import asyncio
import re
from abc import ABC, abstractmethod
from enum import Enum
from typing import List, Optional, Type, TypedDict, TypeVar, Union, cast

from chainlit.action import Action
from chainlit.config import config
from chainlit.context import context
from chainlit.extensions.message import GatherCommand
from chainlit.extensions.types import (
    GatherCommandResponse,
    InputFieldType,
    InputResponse,
    InputSpec,
)
from chainlit.logger import logger
from chainlit.message import AskMessageBase, Message
from chainlit.session import WebsocketSession
from chainlit.telemetry import trace_event
from chainlit.user_session import user_session
from literalai.helper import utc_now
from literalai.step import MessageStepType

ValueType = Optional[Union[str, float, int, bool]]


class ValueTypeEnum(Enum):
    STR = "str"
    FLOAT = "float"
    INT = "int"
    BOOL = "bool"


class ValidateResult(TypedDict):
    value: bool
    errMsg: Optional[str]


class UnknowInputTypeException(Exception):
    def __init__(self):
        super().__init__("未知的输入类型")


class Rule(ABC):
    errMsg: str

    @abstractmethod
    def validate(self, value: ValueType) -> ValidateResult:
        pass

    def toResult(self, res: bool) -> ValidateResult:
        return (
            {"value": True, "errMsg": None}
            if res
            else {"value": False, "errMsg": self.errMsg}
        )


class InputBase(AskMessageBase, ABC):
    fieldType: InputFieldType = "text"
    raise_on_timeout: bool = False
    valueType: ValueTypeEnum = ValueTypeEnum.STR

    def __init__(
        self,
        content: str,
        rules: Optional[List[Rule]],
        timeout: int = 60,
        speechContent: str = "",
        type: MessageStepType = "assistant_message",
        actions: List[Action] = [],
    ):
        self.rules = rules
        self.content = content
        self.timeout = timeout
        self.type = type
        self.speechContent = speechContent
        self.actions = actions

        # 状态和任务
        self._canceled: bool = False
        self._task: Union[asyncio.Task, None] = None
        self._cmd_tasks: List[GatherCommand] = []

    def __post_init__(self) -> None:
        if not getattr(self, "author", None):
            self.author = config.ui.name
        if not getattr(self, "actions", None):
            self.actions = []
        self._cmd_tasks = []
        self._canceled = False

        super().__post_init__()

    @abstractmethod
    async def recognation(self, value: str) -> Optional[Union[str, GatherCommand]]:
        pass

    async def actionhook(self, value: Action) -> Optional[GatherCommand]:
        return None

    async def transfomer_cmd_res(self, cmd: GatherCommandResponse) -> Optional[str]:
        return None

    async def cancel(self):
        if self._canceled:
            return
        self._canceled = True
        try:
            self._task is not None and self._task.cancel()
            for item in self._cmd_tasks:
                item.cancel()
        except Exception as e:
            logger.error(f"failed to cancel {str(e)}")

    async def _processCmd(self, cmd: GatherCommand) -> Optional[str]:
        self._cmd_tasks.append(cmd)
        cmdRes = await cmd.send()
        index = len(self._cmd_tasks) - 1
        del self._cmd_tasks[index]

        if cmdRes:
            resTransfomer = await self.transfomer_cmd_res(cmdRes)
            if resTransfomer:
                await Message(content=str(resTransfomer), type="user_message").send()
                return resTransfomer
        return None

    def _transform(self, value: str) -> ValueType:
        if self.valueType is ValueTypeEnum.FLOAT:
            return float(value)
        if self.valueType is ValueTypeEnum.BOOL:
            return bool(value)
        if self.valueType is ValueTypeEnum.INT:
            return int(value)
        return value

    async def _processRules(self, value: Optional[str]) -> ValueType:

        if value is None:
            return value

        _value = self._transform(value)

        if not self.rules:
            return _value

        errors = []
        for rule in self.rules:
            ruleRes = rule.validate(_value)
            if not ruleRes["value"] and ruleRes["errMsg"] is not None:
                errors.append(ruleRes["errMsg"])

        if not len(errors):
            return _value

        self.content = "；\n".join(errors) + ";\n请重新输入"
        self.speechContent = "请重新输入"
        return None

    async def _processInput(self, res: Union[InputResponse, None]) -> ValueType:

        if res is None:
            return res

        if res["type"] == "click":

            action: Action = [
                action for action in self.actions if res["value"] == action.id
            ][0]
            await context.emitter.task_start()
            actionRes = await self.actionhook(action)

            if actionRes is None:
                return None

            actionCmd: GatherCommand = actionRes
            return await self._processRules(await self._processCmd(actionCmd))

        if res["type"] == "input":
            return await self._processRules(res["value"])

        if res["type"] == "asr_res":
            hookRes = await self.recognation(res["value"])
            if hookRes is None:
                self.content = "语义解析失败，请重新录入"
            if isinstance(hookRes, GatherCommand):
                cmd: GatherCommand = hookRes
                return await self._processRules(await self._processCmd(cmd))
            return await self._processRules(hookRes)

        raise UnknowInputTypeException()

    async def input_send(self) -> ValueType:

        trace_event("send_input")
        if not self._isOnline():
            return None

        if not self.created_at:
            self.created_at = utc_now()

        if config.code.author_rename:
            self.author = await config.code.author_rename(self.author)

        step_dict = await self._create()
        action_keys = []

        for action in self.actions:
            action_keys.append(action.id)
            await action.send(for_id=str(step_dict["id"]))

        spec = InputSpec(type=self.fieldType, timeout=self.timeout, keys=action_keys)

        processRes = None

        try:
            if self._canceled:
                return None

            self._task = asyncio.create_task(
                context.emitter.send_input(step_dict, spec, self.raise_on_timeout)
            )

            res = cast(
                Union[InputResponse, None],
                await self._task,
            )

            while True:
                self._task = None
                processRes = await self._processInput(res)
                if processRes is not None:
                    break
                step_dict = await self._create()

                if self._canceled:
                    break

                if not self._isOnline():
                    break

                self._task = asyncio.create_task(
                    context.emitter.update_input(step_dict, spec, self.raise_on_timeout)
                )
                res = await self._task
        except asyncio.CancelledError:
            pass

        finally:
            for action in self.actions:
                await action.remove()
            await context.emitter.clear("clear_input")
        return processRes

    def _isOnline(self) -> bool:
        return True if WebsocketSession.get_by_id(user_session.get("id")) else False


class NumberInput(InputBase):
    fieldType: InputFieldType = "number"
    # 当valueType为float时会使用该参数设置允许输入的小数位数
    decimalPlaces: int = -1


class TextInput(InputBase):
    fieldType = "text"
    valueType: ValueTypeEnum = ValueTypeEnum.STR
    length: Optional[int]


class FixedLength(Rule):

    def __init__(self, length: int, errMsg: str):
        self.errMsg = errMsg
        self.length = length

    def validate(self, value: ValueType) -> ValidateResult:
        try:
            return self.toResult(isinstance(value, str) and len(value) == self.length)
        except TypeError as e:
            logger.error(f"{type(self).__name__} validate failed {str(e)}")
            raise e


class AccountInput(TextInput):

    def __init__(
        self,
        rules: Optional[List[Rule]] = [],
        timeout: int = 60,
        content: str = "请扫描或录入账号",
        speechContent: str = "请扫描或录入账号",
    ):
        self.rules = rules if rules is not None else []
        self.content = content
        self.timeout = timeout
        self.speechContent = speechContent
        self.actions = [Action(label="扫一扫", name="scan", value="scan")]
        super().__post_init__()

    async def actionhook(self, action: Action) -> Union[GatherCommand, None]:
        logger.info(f"actionhook {action}")
        return GatherCommand(action="scan") if action.name == "scan" else None

    async def recognation(self, value: str) -> Optional[Union[str, GatherCommand]]:
        return await config.code.on_recognation_input["__account__"](value)

    async def transfomer_cmd_res(self, cmdRes: GatherCommandResponse) -> Optional[str]:
        if cmdRes.type == "scan" and cmdRes.code == "00":
            fileId = cmdRes.data["value"]
            filePath = WebsocketSession.get_by_id(user_session.get("id")).files[fileId][
                "path"
            ]
            return await config.code.on_recognation_input["__image_account__"](filePath)

        return None

    async def send(self) -> ValueType:
        return await super().input_send()


class ChinesePhoneNumberRule(Rule):

    def __init__(self):
        self.errMsg = "手机号码格式不正确"

    def validate(self, value: ValueType) -> ValidateResult:
        try:
            if not isinstance(value, str):
                return self.toResult(False)
            # 正则表达式匹配模式，支持 13x、14x、15x、16x、17x、18x、19x 号段
            pattern = re.compile(r"^1[3-9]\d{9}$")
            res = bool(pattern.match(value))
            return self.toResult(res)
        except Exception as e:
            logger.error(f"{type(self).__name__} validate failed {str(e)}")
            raise e


class MobilePhoneInput(TextInput):

    def __init__(
        self,
        rules: Optional[List[Rule]] = [],
        timeout: int = 60,
        content: str = "请录入手机号码",
        speechContent: str = "请录入手机号码",
    ):
        self.rules = (
            [ChinesePhoneNumberRule(), *rules]
            if rules is not None
            else [ChinesePhoneNumberRule()]
        )
        self.content = content
        self.timeout = timeout
        self.speechContent = speechContent
        self.valueType = ValueTypeEnum.STR
        super().__post_init__()

    async def recognation(self, value: str) -> Union[str, GatherCommand]:
        return await config.code.on_recognation_input["__mobilephone__"](value)

    async def send(self) -> ValueType:
        return await super().input_send()


class AmountInput(NumberInput):
    valueType: ValueTypeEnum = ValueTypeEnum.FLOAT

    def __init__(
        self,
        rules: Optional[List[Rule]] = [],
        timeout: int = 60,
        content: str = "请录入金额",
        speechContent: str = "请录入金额",
    ):
        self.rules = rules if rules is not None else []
        self.content = content
        self.timeout = timeout
        self.speechContent = speechContent
        super().__post_init__()

    async def send(self) -> ValueType:
        return await super().input_send()

    async def recognation(self, value: str) -> Union[str, GatherCommand]:
        return await config.code.on_recognation_input["__amount__"](value)


InputType = Type[Union[TextInput, NumberInput]]


class CompositeInput(TextInput):
    def __init__(
        self,
        content: str,
        speechContent: str = "",
        timeout: int = 60,
        optionals: List[InputType] = [],
    ):
        self.content = content
        self.timeout = timeout
        self.speechContent = speechContent
        self.optionals = optionals

    async def send(self) -> ValueType:
        return "复合输入场"

    async def recognation(self, value: str) -> Union[str, GatherCommand]:
        return await config.code.on_recognation_input["__composite__"](value)
