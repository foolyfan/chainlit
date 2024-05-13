import uuid
from dataclasses import field
from typing import Literal, Optional, TypeVar

from chainlit.context import context
from chainlit.telemetry import trace_event
from dataclasses_json import DataClassJsonMixin
from pydantic.dataclasses import Field, dataclass

ListActionType = Literal["data", "image", "external"]


@dataclass
class ListAction(DataClassJsonMixin):
    type: ListActionType
    # 回调使用，extensions代码socket process_list_action；只有使用者设置了自定义回调才需要设置
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
        await context.emitter.emit("list_action", self.to_dict())

    async def remove(self):
        trace_event(f"remove {self.__class__.__name__}")
        await context.emitter.emit("remove_list_action", self.to_dict())


# 指定这个类型变量的上界（upper bound）,限定了类型变量所能代表的具体类型必须是某个特定类型（或其子类）的实例
LA = TypeVar("LA", bound=ListAction)


@dataclass
class ChoiceAction(ListAction):
    data: dict = field(default_factory=dict)
    type: ListActionType = "data"


@dataclass
class ExternalAction(ListAction):
    type: ListActionType = "external"
    label: str = "新增"


@dataclass
class ChoiceImageAction(ListAction):
    path: Optional[str] = None
    url: Optional[str] = None
    type: ListActionType = "image"
    display: str = "inline"
    imageName: str = "默认"
