import re
from abc import ABC
from dataclasses import dataclass
from typing import Callable, List, Optional, TypedDict, TypeVar, Union, cast

from chainlit.action import Action
from chainlit.config import config
from chainlit.context import context
from chainlit.extensions.message import GatherCommand
from chainlit.extensions.types import GatherCommandResponse, InputResponse, InputSpec
from chainlit.message import AskMessageBase
from chainlit.telemetry import trace_event
from literalai.helper import utc_now
from literalai.step import MessageStepType


class ValidateResult(TypedDict):
    value: bool
    errmsg: Optional[str]


class UnImplementedCmdTransformException(Exception):
    def __init__(self):
        super().__init__("未实现采集命令结果转换函数")


class UnknowInputTypeException(Exception):
    def __init__(self):
        super().__init__("未知的输入类型")


class InputBase(AskMessageBase, ABC):

    def __init__(
        self,
        content: str,
        rules: Optional[List[Callable[[str], ValidateResult]]],
        contentRecognitionHook: Callable[[str], Union[str, GatherCommand, None]],
        actionHook: Optional[Callable[[Action], Union[GatherCommand, None]]],
        gatherCommandHook: Optional[
            Callable[[GatherCommandResponse], Union[str, None]]
        ],
        timeout: int = 60,
        raise_on_timeout: bool = False,
        speechContent: str = "",
        author: str = config.ui.name,
        type: MessageStepType = "assistant_message",
        actions: List[Action] = [],
    ):
        self.rules = rules
        self.content = content
        self.author = author
        self.timeout = timeout
        self.type = type
        self.raise_on_timeout = raise_on_timeout
        self.speechContent = speechContent
        self.actions = actions
        self.actionHook = actionHook
        self.contentRecognitionHook = contentRecognitionHook
        self.gatherCommandHook = gatherCommandHook
        super().__post_init__()

    async def _processCmd(self, cmd: GatherCommand) -> Union[str, None]:
        cmdRes = await cmd.send()
        if not self.gatherCommandHook:
            raise UnImplementedCmdTransformException()
        if cmdRes is None:
            return cmdRes
        return self.gatherCommandHook(cmdRes)

    async def _processRules(self, value: Union[str, None]) -> Union[str, None]:
        if value is None:
            return value
        if not self.rules:
            return value

        errors = []
        for rule in self.rules:
            ruleRes = rule(value)
            if ruleRes["value"] is not None and ruleRes["errmsg"] is not None:
                errors.append(ruleRes["errmsg"])

        if not len(errors):
            return value
        self.content = "；".join(errors) + "\n请重新输入"
        self.speechContent = "请重新输入"
        return None

    async def processInput(self, res: Union[InputResponse, None]) -> Union[str, None]:

        if res is None:
            return res

        if res["type"] == "click":
            action: Action = [
                action for action in self.actions if res["value"] == action.id
            ][0]
            if self.actionHook:
                actionRes = self.actionHook(action)
                if actionRes is None:
                    return None
                actionCmd: GatherCommand = actionRes
                return await self._processRules(await self._processCmd(actionCmd))
            self.content = f"服务端未实现该功能 {action.label}"
            return None

        if res["type"] == "input":
            return await self._processRules(res["value"])

        if res["type"] == "asr_res":
            hookRes = self.contentRecognitionHook(res["value"])
            if hookRes is None:
                self.content = "语义解析失败，请重新录入"
            if isinstance(hookRes, GatherCommand):
                cmd: GatherCommand = hookRes
                return await self._processRules(await self._processCmd(cmd))
            return await self._processRules(hookRes)

        raise UnknowInputTypeException()

    async def send(self) -> str:

        trace_event("send_input")
        if not self.created_at:
            self.created_at = utc_now()

        if config.code.author_rename:
            self.author = await config.code.author_rename(self.author)

        step_dict = await self._create()
        action_keys = []

        for action in self.actions:
            action_keys.append(action.id)
            await action.send(for_id=str(step_dict["id"]))

        spec = InputSpec(type="text", timeout=self.timeout, keys=action_keys)

        res = cast(
            Union[InputResponse, None],
            await context.emitter.send_input(step_dict, spec, self.raise_on_timeout),
        )

        processRes = None

        while True:
            processRes = await self.processInput(res)
            if processRes is not None:
                break
            res = await context.emitter.update_input(
                step_dict, spec, self.raise_on_timeout
            )

        for action in self.actions:
            await action.remove()

        return processRes


class NumberInput(InputBase):
    pass


def lenValidate(value) -> ValidateResult:
    res = len(value) == 19
    return {"value": res, "errmsg": None if res else "账号长度不满足19位的要求"}


class AccountInput(NumberInput):

    def __init__(
        self,
        timeout: int = 60,
        content: str = "请扫描或录入账号",
        speechContent: str = "请扫描或录入账号",
    ):
        self.rules = [lenValidate]
        self.content = content
        self.timeout = timeout
        self.speechContent = speechContent

    async def send(self) -> str:
        return "6217258185020246972"


def validate_chinese_phone_number(value: str) -> ValidateResult:
    # 正则表达式匹配模式，支持 13x、14x、15x、16x、17x、18x、19x 号段
    pattern = re.compile(r"^1[3-9]\d{9}$")
    res = bool(pattern.match(value))
    return {"value": res, "errmsg": None if res else "手机号码格式不正确"}


class MobilePhoneInput(NumberInput):
    def __init__(
        self,
        timeout: int = 60,
        content: str = "请录入手机号码",
        speechContent: str = "请录入手机号码",
    ):
        self.rules = [validate_chinese_phone_number]
        self.content = content
        self.timeout = timeout
        self.speechContent = speechContent

    async def send(self) -> str:
        return "18536403990"


def validate_decimal(value: str) -> ValidateResult:
    pattern = re.compile(r"^\d+(\.\d{1,2})?$")
    res = bool(pattern.match(value))
    return {
        "value": res,
        "errmsg": None if res else "金额格式不正确，请核对。仅允许保持小数点后两位",
    }


class AmountInput(NumberInput):
    def __init__(
        self,
        timeout: int = 60,
        content: str = "请录入金额",
        speechContent: str = "请录入金额",
    ):
        self.rules = [validate_decimal]
        self.content = content
        self.timeout = timeout
        self.speechContent = speechContent

    async def send(self) -> str:
        return "5000.33"


class TextInput(InputBase):
    def __init__(
        self,
        content: str,
        rules: List[Callable[[str], ValidateResult]] = [],
        speechContent: str = "",
        timeout: int = 60,
    ):
        self.rules = rules
        self.content = content
        self.timeout = timeout
        self.speechContent = speechContent

    async def send(self) -> str:
        return ""
