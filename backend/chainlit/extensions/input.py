import asyncio
import re
from abc import ABC, abstractmethod
from typing import Callable, List, Literal, Optional, Type, TypedDict, Union, cast

from chainlit.action import Action
from chainlit.config import config
from chainlit.context import context
from chainlit.extensions.message import GatherCommand
from chainlit.extensions.types import (
    GatherCommandResponse,
    InputResponse,
    InputSpec,
    InputValueType,
)
from chainlit.logger import logger
from chainlit.message import AskMessageBase
from chainlit.session import WebsocketSession
from chainlit.telemetry import trace_event
from chainlit.user_session import user_session
from literalai.helper import utc_now
from literalai.step import MessageStepType


class ValidateResult(TypedDict):
    value: bool
    errmsg: Optional[str]


class UnknowInputTypeException(Exception):
    def __init__(self):
        super().__init__("未知的输入类型")


class InputBase(AskMessageBase, ABC):

    def __init__(
        self,
        content: str,
        rules: Optional[List[Callable[[str], ValidateResult]]],
        timeout: int = 60,
        raise_on_timeout: bool = False,
        speechContent: str = "",
        type: MessageStepType = "assistant_message",
        actions: List[Action] = [],
        strategy: Literal["repeat", "once"] = "repeat",
    ):
        self.rules = rules
        self.content = content
        self.timeout = timeout
        self.type = type
        self.raise_on_timeout = raise_on_timeout
        self.speechContent = speechContent
        self.actions = actions
        self.strategy = strategy

        self._task: Union[asyncio.Task, None] = None

    def __post_init__(self) -> None:
        if not getattr(self, "author", None):
            self.author = config.ui.name
        if not getattr(self, "actions", None):
            self.actions = []
        super().__post_init__()

    @abstractmethod
    async def recognation(self, value: str) -> Union[str, GatherCommand, None]:
        pass

    async def actionhook(self, value: Action) -> Union[GatherCommand, None]:
        pass

    async def transfomer_cmd_res(self, cmd: GatherCommandResponse) -> Union[str, None]:
        pass

    def cancel(self):
        self._task is not None and self._task.cancel()

    async def _processCmd(self, cmd: GatherCommand) -> Union[str, None]:
        cmdRes = await cmd.send()
        if cmdRes:
            return await self.transfomer_cmd_res(cmdRes)
        return None

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
        self.content = "；\n".join(errors) + ";\n请重新输入"
        self.speechContent = "请重新输入"
        return None

    async def _processInput(self, res: Union[InputResponse, None]) -> Union[str, None]:
        logger.info(f"_processInput {res}")
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

    async def input_send(self, type: InputValueType) -> Union[str, None]:

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

        spec = InputSpec(type=type, timeout=self.timeout, keys=action_keys)

        try:
            self._task = asyncio.create_task(
                context.emitter.send_input(step_dict, spec, self.raise_on_timeout)
            )

            res = cast(
                Union[InputResponse, None],
                await self._task,
            )  # 等待任务完成，捕获取消任务的异常

            processRes = None

            while True:
                processRes = await self._processInput(res)
                if processRes is not None:
                    break
                step_dict = await self._create()

                if not self._isOnline():
                    return None

                self._task = asyncio.create_task(
                    context.emitter.update_input(step_dict, spec, self.raise_on_timeout)
                )
                res = await self._task
        except asyncio.CancelledError:
            await context.emitter.clear("clear_input")

        finally:
            for action in self.actions:
                await action.remove()
        return processRes

    def _isOnline(self) -> bool:
        return True if WebsocketSession.get_by_id(user_session.get("id")) else False


class NumberInput(InputBase):
    pass


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

    async def send(self) -> Union[str, None]:
        return ""


InputType = Type[Union[TextInput, NumberInput]]


def lenValidate(value) -> ValidateResult:
    res = len(value) == 6
    return {"value": res, "errmsg": None if res else "账号长度不满足6位的要求"}


def startValidate(value: str) -> ValidateResult:
    res = value.startswith("622")
    return {"value": res, "errmsg": None if res else "账号需以622开头"}


class AccountInput(NumberInput):

    def __init__(
        self,
        rules: Optional[List[Callable[[str], ValidateResult]]],
        timeout: int = 60,
        content: str = "请扫描或录入账号",
        speechContent: str = "请扫描或录入账号",
    ):
        self.rules = rules if rules is not None else []
        self.content = content
        self.timeout = timeout
        self.speechContent = speechContent
        self.actions = [Action(label="扫一扫", name="scan", value="scan")]
        self.raise_on_timeout = False
        super().__post_init__()

    async def actionhook(self, action: Action) -> Union[GatherCommand, None]:
        logger.info(f"actionhook {action}")
        return GatherCommand(action="scan") if action.name == "scan" else None

    async def recognation(self, value: str) -> Union[str, GatherCommand, None]:
        return await config.code.on_recognation_input["__account__"](value)

    async def transfomer_cmd_res(
        self, cmdRes: GatherCommandResponse
    ) -> Union[str, None]:
        if cmdRes.type == "scan":
            return cmdRes.data["value"]
        return None

    async def send(self) -> Union[str, None]:
        return await super().input_send("number")


def validate_chinese_phone_number(value: str) -> ValidateResult:
    # 正则表达式匹配模式，支持 13x、14x、15x、16x、17x、18x、19x 号段
    pattern = re.compile(r"^1[3-9]\d{9}$")
    res = bool(pattern.match(value))
    return {"value": res, "errmsg": None if res else "手机号码格式不正确"}


class MobilePhoneInput(NumberInput):
    def __init__(
        self,
        rules: Optional[List[Callable[[str], ValidateResult]]],
        timeout: int = 60,
        content: str = "请录入手机号码",
        speechContent: str = "请录入手机号码",
    ):
        self.rules = (
            [*rules, validate_chinese_phone_number]
            if rules is not None
            else [validate_chinese_phone_number]
        )
        self.content = content
        self.timeout = timeout
        self.speechContent = speechContent
        self.raise_on_timeout = False
        super().__post_init__()

    async def recognation(self, value: str) -> Union[str, GatherCommand, None]:
        return await config.code.on_recognation_input["__mobilephone__"](value)

    async def send(self) -> Union[str, None]:
        return await super().input_send("number")


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
        rules: Optional[List[Callable[[str], ValidateResult]]],
        timeout: int = 60,
        content: str = "请录入金额",
        speechContent: str = "请录入金额",
    ):
        self.rules = (
            [*rules, validate_decimal] if rules is not None else [validate_decimal]
        )
        self.content = content
        self.timeout = timeout
        self.speechContent = speechContent
        self.raise_on_timeout = False
        super().__post_init__()

    async def send(self) -> Union[str, None]:
        return await super().input_send("number")

    async def recognation(self, value: str) -> Union[str, GatherCommand, None]:
        return await config.code.on_recognation_input["__amount__"](value)


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

    async def send(self) -> Union[str, None]:
        return "复合输入场"

    async def recognation(self, value: str) -> Union[str, GatherCommand, None]:
        return await config.code.on_recognation_input["__composite__"](value)
