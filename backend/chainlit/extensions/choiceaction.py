import uuid
from dataclasses import field
from typing import Optional

from chainlit.context import context
from chainlit.telemetry import trace_event
from dataclasses_json import DataClassJsonMixin
from pydantic.dataclasses import Field, dataclass


@dataclass
class ChoiceAction(DataClassJsonMixin):
    data: dict
    # 回调使用，代码socket process_choice_ction
    name: Optional[str] = None
    # This should not be set manually, only used internally.
    forId: Optional[str] = None
    # The ID of the action
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))

    def __post_init__(self) -> None:
        trace_event(f"init {self.__class__.__name__}")

    async def send(self, for_id: str):
        trace_event(f"send {self.__class__.__name__}")
        self.forId = for_id
        await context.emitter.emit("choice_action", self.to_dict())

    async def remove(self):
        trace_event(f"remove {self.__class__.__name__}")
        await context.emitter.emit("remove_choice_action", self.to_dict())


@dataclass
class ExternalAction(ChoiceAction):
    data: dict = field(default_factory=dict)
    # 前端区分action类型使用
    external: bool = True
    display: bool = False
    label: str = "新增"
