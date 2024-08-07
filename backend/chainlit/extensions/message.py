import asyncio
from typing import Awaitable, Callable, List, Literal, Optional, Union, cast

from chainlit.action import Action
from chainlit.config import config
from chainlit.context import context
from chainlit.element import ElementBased
from chainlit.extensions.exceptions import AskTimeoutError, ManualCancelError
from chainlit.extensions.types import (
    BaseResponse,
    CheckSpec,
    ChoiceItem,
    ChoiceSpec,
    GatherCommandResponse,
    GatherCommandSpec,
    GatherCommandType,
    JsFunction,
    MdLink,
    PreselectionSpec,
    PSInputItem,
    PSMessageItem,
    SubChoiceWidget,
)
from chainlit.logger import logger
from chainlit.message import AskMessageBase, MessageBase
from chainlit.telemetry import trace_event
from literalai.helper import utc_now
from socketio.exceptions import TimeoutError


class AskUserChoiceMessage(AskMessageBase):
    """
    textReply的返回值类型为ChoiceItem和SubChoiceWidget的data类型
    """

    def __init__(
        self,
        items: List[ChoiceItem],
        textReply: Callable[
            [str, List[ChoiceItem], Optional[List[SubChoiceWidget]]],
            Awaitable[Union[dict, str]],
        ],
        choiceContent: str = "请在以下数据中做出选择：",
        timeoutContent: str = "选择任务超时",
        author=config.ui.name,
        disable_feedback=False,
        timeout=90,
        raise_on_timeout=False,
        speechContent: str = "",
        widgets: Optional[List[SubChoiceWidget]] = None,
    ):
        self.content = choiceContent
        self.author = author
        self.disable_feedback = disable_feedback
        self.textReply = textReply
        self.timeout = timeout
        self.timeoutContent = timeoutContent
        self.raise_on_timeout = raise_on_timeout
        self.items = items
        self.speechContent = speechContent
        self.widgets = widgets
        super().__post_init__()

    async def send(self) -> Union[dict, str]:
        """
        Sends the question to ask to the UI and waits for the reply
        """
        trace_event("send_ask_action")

        if not self.created_at:
            self.created_at = utc_now()

        if self.streaming:
            self.streaming = False

        if config.code.author_rename:
            self.author = await config.code.author_rename(self.author)

        self.wait_for_answer = True

        step_dict = await self._create()

        spec = ChoiceSpec(items=self.items, timeout=self.timeout)
        try:
            res = cast(
                BaseResponse,
                await context.emitter.ask_user(step_dict, spec, self.timeout),
            )
            if res.type == "keyboard" or res.type == "speech":
                return await self.textReply(res.data, self.items, self.widgets)
            elif res.type == "touch":
                return res.data
        except TimeoutError as e:
            raise AskTimeoutError() from None
        except Exception as e:
            logger.error(f"Unknow Error: {e}")
            raise e


class GatherCommand(MessageBase):

    def __init__(
        self,
        action: GatherCommandType,
        timeout=90,
        author=config.ui.name,
        speechContent: str = "",
    ):
        self.timeout = timeout
        self.author = author
        self.action = action
        self.speechContent = speechContent
        self._task: Optional[asyncio.Task] = None
        super().__post_init__()

    async def send(self) -> Union[GatherCommandResponse, None]:
        """
        Sends the question to ask to the UI and waits for the reply
        """
        trace_event("gather_command")

        if not self.created_at:
            self.created_at = utc_now()

        if self.streaming:
            self.streaming = False

        if config.code.author_rename:
            self.author = await config.code.author_rename(self.author)

        self.wait_for_answer = True
        step_dict = await self._create()
        spec = GatherCommandSpec(
            type=self.action,
            timeout=self.timeout,
        )
        try:
            self._task = asyncio.create_task(
                context.emitter.gather_command(step_dict, spec)
            )
            res = await self._task
            self._task = None
            return GatherCommandResponse.from_dict(res)
        except asyncio.CancelledError:
            raise ManualCancelError() from None
        except TimeoutError:
            raise AskTimeoutError() from None

    def cancel(self):
        self._task is not None and self._task.cancel()


class JsFunctionCommand(MessageBase):

    def __init__(
        self,
        commands: List[JsFunction],
    ):
        self.commands = commands
        self.author = config.ui.name
        self.created_at = utc_now()
        super().__post_init__()

    async def send(self):
        trace_event("call_jsfunction")

        step_dict = await self._create()
        spec = self.commands
        await context.emitter.call_js_function(step_dict, spec)


class PreselectionMessage(MessageBase):

    def __init__(
        self,
        items: Union[List[PSInputItem], List[PSMessageItem]],
        psType: Literal["input", "message"],
        content: str = "",
        elements: Optional[List[ElementBased]] = None,
        speechContent: str = "",
        mdLinks: Optional[List[MdLink]] = None,
    ):
        self.items = items
        self.content = content
        self.psType = psType
        self.author = config.ui.name
        self.speechContent = speechContent
        self.elements = elements
        self.created_at = utc_now()
        self.speechContent = speechContent
        self.mdLinks = mdLinks
        super().__post_init__()

    async def send(self):
        trace_event("advise_preselection")

        step_dict = await self._create()
        spec = PreselectionSpec(
            type=self.psType, items=self.items, mdLinks=self.mdLinks
        )
        if self.elements:
            # Create tasks for elements
            tasks = [element.send(for_id=self.id) for element in self.elements]

            # Run all tasks concurrently
            await asyncio.gather(*tasks)

        await context.emitter.advise(step_dict, spec)
        await context.emitter.task_end()

    async def clear_input(self):
        if self.psType != "input":
            return
        await context.emitter.clear("clear_input_advise")


class AskUserCheckAgreeement(AskMessageBase):

    def __init__(
        self,
        mdAgreementLinks: List[MdLink],
        textReply: Callable[[str], Awaitable[bool]],
        content: str,
        author=config.ui.name,
        mdLinks: Optional[List[MdLink]] = None,
        disable_feedback=False,
        timeout=90,
        raise_on_timeout=False,
        speechContent: str = "",
    ):
        self.content = content
        self.author = author
        self.disable_feedback = disable_feedback
        self.textReply = textReply
        self.timeout = timeout
        self.raise_on_timeout = raise_on_timeout
        self.mdAgreementLinks = mdAgreementLinks
        self.mdLinks = mdLinks
        self.speechContent = speechContent
        self.actions: List[Action] = [
            Action(label="确认", value="agree", name="agree", data="agree")
        ]
        super().__post_init__()

    async def send(self) -> bool:
        """
        Sends the question to ask to the UI and waits for the reply.
        """
        trace_event("ask_user")
        if not self.created_at:
            self.created_at = utc_now()

        if config.code.author_rename:
            self.author = await config.code.author_rename(self.author)

        if self.streaming:
            self.streaming = False

        step_dict = await self._create()

        spec = CheckSpec(
            timeout=self.timeout,
            actions=self.actions,
            mdAgreementLinks=self.mdAgreementLinks,
            mdLinks=self.mdLinks,
        )

        try:
            res = cast(
                BaseResponse,
                await context.emitter.ask_user(step_dict, spec, self.timeout),
            )

            if res.type == "keyboard" or res.type == "speech":
                return await self.textReply(res.data)
            elif res.type == "touch":
                return True
        except TimeoutError as e:
            raise AskTimeoutError() from None
        except Exception as e:
            logger.error(f"Unknow Error: {e}")
            raise e
