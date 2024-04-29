import typing
from typing import Awaitable, Callable, List, Literal, TypedDict, Union, cast

from chainlit.config import config
from chainlit.context import context
from chainlit.extensions.choiceaction import ChoiceAction
from chainlit.extensions.types import AskChoiceActionSpec
from chainlit.message import AskMessageBase
from chainlit.telemetry import trace_event
from chainlit.types import AskActionResponse
from literalai.helper import utc_now


class AskChoiceActionResponse(TypedDict):
    value: str
    forId: str
    id: str
    collapsed: bool


class AskUserChoiceMessage(AskMessageBase):
    """
    Ask the user to select an action before continuing.
    If the user does not answer in time (see timeout), a TimeoutError will be raised or None will be returned depending on raise_on_timeout.
    """

    def __init__(
        self,
        datadef: str,
        choiceActions: List[ChoiceAction],
        layout: List[typing.Dict[Literal["field", "name"], typing.Any]],
        callback: Callable[[str, List], Awaitable[str]],
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
        self.callback = callback
        self.timeout = timeout
        self.raise_on_timeout = raise_on_timeout
        self.choiceActions = choiceActions
        super().__post_init__()

    async def send(self) -> Union[AskChoiceActionResponse, None]:
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
            Union[AskChoiceActionResponse, None],
            await context.emitter.send_ask_user(step_dict, spec, self.raise_on_timeout),
        )

        for action in self.choiceActions:
            await action.remove()
        if res is None:
            self.content = "完成选择任务超时"
        else:
            choices = []
            for item in self.choiceActions:
                choices.append(item.data)
            choice = await self.callback(res["value"], choices)
            self.content = f"根据您的要求，我将使用以下数据：\n{choice}\n作为选择{self.datadef}的结果。"

        self.wait_for_answer = False

        await self.update()

        return res
