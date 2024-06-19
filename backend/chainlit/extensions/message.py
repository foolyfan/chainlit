import asyncio
import typing
from dataclasses import dataclass
from typing import Awaitable, Callable, List, Literal, Optional, Union, cast

from chainlit.config import config
from chainlit.context import context
from chainlit.extensions.listaction import LA, ChoiceImageAction
from chainlit.extensions.types import (
    AskListActionSpec,
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
from chainlit.types import AskUserResponse
from dataclasses_json import DataClassJsonMixin
from literalai.helper import utc_now


class AskUserChoiceMessage(AskMessageBase):
    """
    Ask the user to select an action before continuing.
    If the user does not answer in time (see timeout), a TimeoutError will be raised or None will be returned depending on raise_on_timeout.
    """

    def __init__(
        self,
        choiceActions: List[LA],
        layout: List[typing.Dict[Literal["field", "width"], typing.Any]],
        choiceHook: Callable[
            [AskUserResponse, List[LA]],
            Awaitable[typing.Any],
        ],
        choiceContent: str = "请在以下数据中做出选择：",
        timeoutContent: str = "选择任务超时",
        author=config.ui.name,
        disable_feedback=False,
        timeout=90,
        raise_on_timeout=False,
        speechContent: str = "",
    ):
        self.content = choiceContent
        self.layout = layout
        self.author = author
        self.disable_feedback = disable_feedback
        self.choiceHook = choiceHook
        self.timeout = timeout
        self.timeoutContent = timeoutContent
        self.raise_on_timeout = raise_on_timeout
        self.choiceActions = choiceActions
        self.speechContent = speechContent
        super().__post_init__()

    async def _create(self):
        for listAction in self.choiceActions:
            if isinstance(listAction, ChoiceImageAction):
                await listAction._create()
        return await super()._create()

    async def send(self) -> Union[typing.Any, None]:
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

        action_keys = []

        for action in self.choiceActions:
            action_keys.append(action.id)
            await action.send(for_id=str(step_dict["id"]))
        spec = AskListActionSpec(
            type="list_action",
            timeout=self.timeout,
            keys=action_keys,
            layout=self.layout,
        )

        res = cast(
            Union[AskUserResponse, None],
            await context.emitter.send_ask_user(step_dict, spec, self.raise_on_timeout),
        )

        for action in self.choiceActions:
            await action.remove()
        if res is None:
            self.content = self.timeoutContent
            self.wait_for_answer = False
            await self.update()
        else:
            res = await self.choiceHook(res, self.choiceActions)
        return res


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
    ):
        self.items = items
        self.psType = psType
        self.author = config.ui.name
        self.created_at = utc_now()
        super().__post_init__()

    async def send(self):
        trace_event("change_theme")

        step_dict = await self._create()
        spec = PreselectionSpec(type=self.psType, items=self.items)
        await context.emitter.send_preselection(step_dict, spec)
        await context.emitter.task_end()

    async def clear_prompt(self):
        if self.psType != "prompt":
            return
        await context.emitter.clear("clear_prompt_preselection")
