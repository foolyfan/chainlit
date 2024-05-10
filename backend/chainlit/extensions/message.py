import typing
from typing import Awaitable, Callable, List, Literal, Union, cast

from chainlit.config import config
from chainlit.context import context
from chainlit.extensions.choiceaction import ChoiceAction, ExternalAction
from chainlit.extensions.types import (
    AskChoiceActionSpec,
    GatherCommandSpec,
    GatherCommandType,
)
from chainlit.message import AskMessageBase, MessageBase
from chainlit.telemetry import trace_event
from chainlit.types import AskUserResponse
from literalai.helper import utc_now


class AskUserChoiceMessage(AskMessageBase):
    """
    Ask the user to select an action before continuing.
    If the user does not answer in time (see timeout), a TimeoutError will be raised or None will be returned depending on raise_on_timeout.
    """

    def __init__(
        self,
        choiceActions: List[Union[ChoiceAction, ExternalAction]],
        layout: List[typing.Dict[Literal["field", "width"], typing.Any]],
        choiceHook: Callable[
            [AskUserResponse, List[Union[ChoiceAction, ExternalAction]]],
            Awaitable[typing.Any],
        ],
        choiceContent: str = "请在以下数据中做出选择：",
        timeoutContent: str = "选择任务超时",
        author=config.ui.name,
        disable_feedback=False,
        timeout=90,
        raise_on_timeout=False,
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
        super().__post_init__()

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
        spec = AskChoiceActionSpec(
            type="choice_action",
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
    ):
        self.timeout = timeout
        self.author = author
        self.action = action
        super().__post_init__()

    async def send(self) -> Union[GatherCommandSpec, None]:
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

        res = await context.emitter.gather_command(step_dict, spec, False)

        return res
