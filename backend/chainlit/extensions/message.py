import typing
from dataclasses import dataclass
from typing import Awaitable, Callable, List, Literal, Union, cast

from chainlit.config import config
from chainlit.context import context
from chainlit.extensions.choiceaction import ChoiceAction
from chainlit.extensions.types import AskChoiceActionSpec
from chainlit.message import AskMessageBase
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
        datadef: str,
        choiceActions: List[ChoiceAction],
        layout: List[typing.Dict[Literal["field", "width"], typing.Any]],
        choiceHook: Callable[
            [AskUserResponse, List[ChoiceAction]], Awaitable[typing.Any]
        ],
        author=config.ui.name,
        disable_feedback=False,
        timeout=90,
        raise_on_timeout=False,
    ):
        self.datadef = datadef
        self.content = f"请在以下{datadef}数据中做出选择："
        self.layout = layout
        self.author = author
        self.disable_feedback = disable_feedback
        self.choiceHook = choiceHook
        self.timeout = timeout
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
            self.content = f"选择{self.datadef}任务超时"
            self.wait_for_answer = False
            await self.update()
        else:
            res = await self.choiceHook(res, self.choiceActions)
        return res
