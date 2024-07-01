import asyncio
from typing import Awaitable, Callable, List, Literal, Optional, Union, cast

from chainlit.config import config
from chainlit.context import context
from chainlit.element import ElementBased
from chainlit.extensions.exceptions import AskTimeout
from chainlit.extensions.types import (
    BaseResponse,
    ChoiceItem,
    ChoiceSpec,
    GatherCommandResponse,
    GatherCommandSpec,
    GatherCommandType,
    PreselectionSpec,
    PSMessageItem,
    PSPromptItem,
    UISettingsCommandOptions,
)
from chainlit.logger import logger
from chainlit.message import AskMessageBase, MessageBase
from chainlit.telemetry import trace_event
from literalai.helper import utc_now
from socketio.exceptions import TimeoutError


class AskUserChoiceMessage(AskMessageBase):
    """
    textReply的返回值类型为ChoiceItem的data类型
    """

    def __init__(
        self,
        items: List[ChoiceItem],
        textReply: Callable[[str, List[ChoiceItem]], Awaitable[Union[dict, str]]],
        choiceContent: str = "请在以下数据中做出选择：",
        timeoutContent: str = "选择任务超时",
        author=config.ui.name,
        disable_feedback=False,
        timeout=90,
        raise_on_timeout=False,
        speechContent: str = "",
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
                return await self.textReply(res.data, self.items)
            elif res.type == "touch":
                return res.data
        except TimeoutError as e:
            raise AskTimeout() from None
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
        res = None
        try:
            self._task = asyncio.create_task(
                context.emitter.gather_command(step_dict, spec, False)
            )
            res = await self._task
            self._task = None
        except asyncio.CancelledError:
            await context.emitter.clear("clear_gather_command")

        if res is not None:
            res = GatherCommandResponse.from_dict(res)

        return res

    def cancel(self):
        self._task is not None and self._task.cancel()


class UISettingsCommand(MessageBase):

    def __init__(
        self,
        options: UISettingsCommandOptions,
    ):
        self.options = options
        self.author = config.ui.name
        self.created_at = utc_now()
        super().__post_init__()

    async def send(self):
        trace_event("change_theme")

        step_dict = await self._create()
        spec = self.options
        await context.emitter.change_theme(step_dict, spec)


class PreselectionMessage(MessageBase):

    def __init__(
        self,
        items: Union[List[PSPromptItem], List[PSMessageItem]],
        psType: Literal["message", "prompt"],
        content: str = "",
        elements: Optional[List[ElementBased]] = None,
        speechContent: str = "",
    ):
        self.items = items
        self.content = content
        self.psType = psType
        self.author = config.ui.name
        self.speechContent = speechContent
        self.elements = elements
        self.created_at = utc_now()
        # TODO speechReply
        super().__post_init__()

    async def send(self):
        trace_event("advise_preselection")

        step_dict = await self._create()
        spec = PreselectionSpec(type=self.psType, items=self.items)
        if self.elements:
            # Create tasks for elements
            tasks = [element.send(for_id=self.id) for element in self.elements]

            # Run all tasks concurrently
            await asyncio.gather(*tasks)

        await context.emitter.advise(step_dict, spec)
        await context.emitter.task_end()

    async def clear_prompt(self):
        if self.psType != "prompt":
            return
        await context.emitter.clear("clear_prompt_advise")
