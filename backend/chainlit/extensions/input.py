import asyncio
import re
from abc import ABC, abstractmethod
from dataclasses import dataclass
from enum import Enum
from typing import List, Literal, Optional, Union, cast

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

"""
自定义函数校验，仅包括函数体内容，参数为输入域的值，返回值为校验结果；示例如下：
(value) => {
  return {
    value: false,
    errMsg: '校验失败'
  }
}
"""


@dataclass
class ClientRule(Rule, DataClassJsonMixin):
    condition: TriggerType
    body: str


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
        actions: List[Action] = [],
    ):
        self.rules = rules
        self.content = content
        self.timeout = timeout
        self.type = type
        self.speechContent = speechContent
        self.actions = actions

        # 规则
        self._serverRules: List[ServerRule] = []

        # 状态和任务
        self._canceled: bool = False
        self._task: Union[asyncio.Task, None] = None
        self._cmd_tasks: List[GatherCommand] = []

    def __post_init__(self) -> None:
        if not getattr(self, "author", None):
            self.author = config.ui.name
        if not getattr(self, "actions", None):
            self.actions = []
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
            keys=action_keys,
            rules=clientRules,
        )

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
                    logger.info("用户不在线")
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
        self.actions = [Action(label="扫一扫", name="scan", value="scan")]

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
    body="""
  const regex = /^1[3-9]\d{9}$/;
  return regex.test(value) || '手机号码格式不正确';
""",
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
    body="""
const regex = /^\d*\.?\d{0,2}$/;
return regex.test(value) || '金额只可保留两位小数';
""",
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
        self.actions = [Action(label="扫一扫", name="scan", value="scan")]

        super().__post_init__()

    async def recognation(self, value: str) -> Optional[Union[str, GatherCommand]]:
        return await config.code.on_recognation_input["__account__mobilephone__"](value)
