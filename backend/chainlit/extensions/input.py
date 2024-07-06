import asyncio
import re
from abc import ABC, abstractmethod
from dataclasses import dataclass
from enum import Enum
from typing import List, Literal, Optional, Union, cast

from chainlit.action import Action
from chainlit.config import config
from chainlit.context import context
from chainlit.extensions.exceptions import AskTimeout
from chainlit.extensions.message import GatherCommand
from chainlit.extensions.types import (
    BaseResponse,
    GatherCommandResponse,
    InputFieldType,
    InputSpec,
)
from chainlit.logger import logger
from chainlit.message import AskMessageBase, Message
from chainlit.session import WebsocketSession
from chainlit.telemetry import trace_event
from chainlit.user_session import user_session
from dataclasses_json import DataClassJsonMixin
from literalai.helper import utc_now
from literalai.step import MessageStepType

ValueType = Optional[Union[str, float, int, bool]]


class ValueTypeEnum(Enum):
    STR = "str"
    FLOAT = "float"
    INT = "int"
    BOOL = "bool"


@dataclass
class ValidateResult(DataClassJsonMixin):
    value: bool
    errMsg: Optional[str] = None
    speechContent: Optional[str] = None


class UnknowInputTypeException(Exception):
    def __init__(self):
        super().__init__("未知的输入类型")


class Rule(DataClassJsonMixin, ABC):
    errMsg: str


"""
客户端校验规则
"""

TriggerType = Literal["onChange", "onSubmit"]


@dataclass
class ClientRule(Rule, DataClassJsonMixin):
    """
    web端校验规则，用户自定义在window.__chainlit__rules__对象上定义，以下ClientRule的name属性为example的校验函数，示例：
    window.__chainlit__.rules[example] = (value) => {
        return {
          value: false,
          errMsg: '校验失败'
        }
      }
    """

    condition: TriggerType
    name: str


"""
服务端校验规则
"""


class ServerRule(Rule, ABC):

    @abstractmethod
    async def validate(self, value: ValueType) -> ValidateResult:
        pass

    def toResult(self, res: bool) -> ValidateResult:
        return (
            ValidateResult(value=True)
            if res
            else ValidateResult(value=False, errMsg=self.errMsg)
        )


"""
基础输入场
"""


class InputBase(AskMessageBase, ABC):
    fieldType: InputFieldType = "text"
    raise_on_timeout: bool = False
    valueType: ValueTypeEnum = ValueTypeEnum.STR
    placeholder: str = "请输入内容"

    def __init__(
        self,
        content: str,
        rules: Optional[List[Rule]],
        timeout: int = 60,
        speechContent: str = "",
        type: MessageStepType = "assistant_message",
    ):
        self.rules = rules
        self.content = content
        self.timeout = timeout
        self.type = type
        self.speechContent = speechContent

        # 规则
        self._serverRules: List[ServerRule] = []

        # 状态和任务
        self._canceled: bool = False
        self._task: Union[asyncio.Task, None] = None
        self._cmd_tasks: List[GatherCommand] = []

    def __post_init__(self) -> None:
        if not getattr(self, "author", None):
            self.author = config.ui.name
        self._serverRules = []
        self._cmd_tasks = []
        self._canceled = False

        super().__post_init__()

    """
    支持语音识别
    """

    @abstractmethod
    async def recognation(self, value: str) -> Optional[Union[str, GatherCommand]]:
        pass

    """
    输入场涉及action调用，需要根据客户选择的不同action返回对应的收集指令
    """

    async def actionhook(self, value: Action) -> Optional[GatherCommand]:
        return None

    """
    收集指令产生的结果转换为指定的字符串
    """

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

        if not len(self._serverRules):
            return _value

        errors = []
        speechContents = []
        for rule in self._serverRules:
            ruleRes = await rule.validate(_value)
            if not ruleRes.value:
                if ruleRes.errMsg is not None:
                    errors.append(ruleRes.errMsg)
                if ruleRes.speechContent is not None:
                    speechContents.append(ruleRes.speechContent)

        if not len(errors):
            return _value

        self.content = "；\n".join(errors) + ";\n请重新输入"
        self.speechContent = "；".join(speechContents)
        return None

    async def _processInput(self, res: Optional[BaseResponse]) -> ValueType:
        if res is None:
            return res

        if res.type == "touch":

            action: Action = [
                action
                for action in cast(List[Action], self.actions)
                if res.data == action.data
            ][0]
            await context.emitter.task_start()
            actionRes = await self.actionhook(action)

            if actionRes is None:
                return None

            actionCmd: GatherCommand = actionRes
            return await self._processRules(await self._processCmd(actionCmd))

        if res.type == "keyboard":
            return await self._processRules(res.data)

        if res.type == "speech":
            hookRes = await self.recognation(res.data)
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

        clientRules: List[ClientRule] = []

        if self.rules is not None:
            for rule in self.rules:
                if isinstance(rule, ServerRule):
                    self._serverRules.append(rule)
                if isinstance(rule, ClientRule):
                    clientRules.append(rule)
        spec = InputSpec(
            type=self.fieldType,
            timeout=self.timeout,
            placeholder=self.placeholder,
            actions=self.actions,
            rules=clientRules,
        )
        processRes = None

        # 用户输入超时，继续重发，直至输入完成；可通过取消函数中止
        try:
            if self._canceled:
                return None

            self._task = asyncio.create_task(
                context.emitter.send_input(step_dict, spec, self.timeout)
            )
            res = cast(Optional[BaseResponse], await self._task)

            while True:
                self._task = None
                processRes = await self._processInput(res)
                if processRes is not None:
                    break
                step_dict = await self._create()

                if self._canceled:
                    break

                if not self._isOnline():
                    logger.info("用户不在线")
                    break
                self._task = asyncio.create_task(
                    context.emitter.update_input(step_dict, spec, self.timeout)
                )
                res = cast(Optional[BaseResponse], await self._task)
        except asyncio.CancelledError:
            pass
        finally:
            await context.emitter.clear("clear_input", {"msg": step_dict})
        return processRes

    def _isOnline(self) -> bool:
        return True if WebsocketSession.get_by_id(user_session.get("id")) else False


class NumberInput(InputBase, ABC):
    fieldType: InputFieldType = "number"
    placeholder: str = "请输入数字"

    async def send(self) -> ValueType:
        return await super().input_send()


class TextInput(InputBase, ABC):
    fieldType = "text"
    placeholder: str = "请输入文本"

    async def send(self) -> ValueType:
        return await super().input_send()


class FixedLength(ServerRule):

    def __init__(self, length: int, errMsg: str):
        self.errMsg = errMsg
        self.length = length

    async def validate(self, value: ValueType) -> ValidateResult:
        try:
            return self.toResult(isinstance(value, str) and len(value) == self.length)
        except TypeError as e:
            logger.error(f"{type(self).__name__} validate failed {str(e)}")
            raise e


class AccountInput(TextInput):

    def __init__(
        self,
        rules: Optional[List[Rule]] = None,
        timeout: int = 60,
        content: str = "请扫描或录入账号",
        speechContent: str = "请扫描或录入账号",
        placeholder: Optional[str] = "银行账号",
    ):
        if rules is None:
            rules = []
        self.rules = rules
        self.content = content
        self.timeout = timeout
        self.speechContent = speechContent
        if placeholder is not None:
            self.placeholder = placeholder
        self.actions = [Action(label="扫一扫", name="scan", value="scan", data="scan")]

        super().__post_init__()

    async def actionhook(self, action: Action) -> Union[GatherCommand, None]:
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


ChinesePhoneNumberRule = ClientRule(
    condition="onChange",
    name="ChinesePhoneNumberRule",
)


class MobilePhoneInput(TextInput):

    def __init__(
        self,
        rules: Optional[List[Rule]] = None,
        timeout: int = 60,
        content: str = "请录入手机号码",
        speechContent: str = "请录入手机号码",
        placeholder: Optional[str] = "手机号码",
    ):
        if rules is None:
            rules = []
        self.rules = [ChinesePhoneNumberRule, *rules]
        self.content = content
        self.timeout = timeout
        self.speechContent = speechContent
        if placeholder is not None:
            self.placeholder = placeholder
        self.valueType = ValueTypeEnum.STR
        super().__post_init__()

    async def recognation(self, value: str) -> Union[str, GatherCommand]:
        return await config.code.on_recognation_input["__mobilephone__"](value)


DecimalPlaces = ClientRule(
    condition="onChange",
    name="DecimalPlaces",
)


class AmountInput(NumberInput):
    valueType: ValueTypeEnum = ValueTypeEnum.FLOAT

    def __init__(
        self,
        rules: Optional[List[Rule]] = None,
        timeout: int = 60,
        content: str = "请录入金额",
        speechContent: str = "请录入金额",
        placeholder: Optional[str] = "金额",
    ):
        if rules is None:
            rules = []
        self.rules = [DecimalPlaces, *rules]
        self.content = content
        self.timeout = timeout
        self.speechContent = speechContent
        if placeholder is not None:
            self.placeholder = placeholder

        super().__post_init__()

    async def recognation(self, value: str) -> Union[str, GatherCommand]:
        return await config.code.on_recognation_input["__amount__"](value)


class GeneralInput(InputBase, ABC):

    def __init__(
        self,
        content: str,
        placeholder: str,
        recognation: str,
        fieldType: InputFieldType,
        valueType: ValueTypeEnum,
        speechContent: str = "",
        timeout: int = 60,
        rules: Optional[List[Rule]] = None,
        actions: Optional[List[Action]] = None,
    ):
        self.content = content
        self.timeout = timeout
        self.speechContent = speechContent
        self.recognationName = recognation
        if placeholder is not None:
            self.placeholder = placeholder
        self.fieldType = fieldType
        self.valueType = valueType
        if actions is not None:
            self.actions = actions
        if rules is None:
            rules = []

        super().__post_init__()

    async def recognation(self, value: str) -> Union[str, GatherCommand]:
        return await config.code.on_recognation_input[
            f"__general__{self.recognationName}__"
        ](value)


class AccountAndMobilePhoneInput(AccountInput):
    def __init__(
        self,
        rules: Optional[List[Rule]] = None,
        timeout: int = 60,
        content: str = "请录入账号或手机号",
        speechContent: str = "请录入账号或手机号",
        placeholder: Optional[str] = "账号或手机号",
    ):
        if rules is None:
            rules = []
        self.rules = rules
        self.content = content
        self.timeout = timeout
        self.speechContent = speechContent
        if placeholder is not None:
            self.placeholder = placeholder
        self.actions = [Action(label="扫一扫", name="scan", value="scan", data="scan")]

        super().__post_init__()

    async def recognation(self, value: str) -> Optional[Union[str, GatherCommand]]:
        return await config.code.on_recognation_input["__account__mobilephone__"](value)
