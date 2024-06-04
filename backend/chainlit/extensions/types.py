import typing
from dataclasses import dataclass
from typing import Dict, List, Literal, TypedDict

from chainlit.types import ActionSpec, AskSpec
from dataclasses_json import DataClassJsonMixin


@dataclass
class ListActionSpec(ActionSpec):
    layout: List[typing.Dict[Literal["field", "width"], dict]]


@dataclass
class AskListActionSpec(ListActionSpec, AskSpec, DataClassJsonMixin):
    """Specification for asking the user an choice_action"""


GatherCommandType = Literal[
    "capture_idcard", "face_recognition", "password", "custom_card", "scan"
]


@dataclass
class GatherCommandSpec(DataClassJsonMixin):
    timeout: int
    type: GatherCommandType


@dataclass
class GatherCommandResponse(DataClassJsonMixin):
    value: Dict


@dataclass
class InputSpec(DataClassJsonMixin):
    timeout: int
    type: Literal["text", "number"]
    keys: List[str]


class InputResponse(TypedDict):
    value: str
    forId: str
    id: str
    type: Literal["click", "input", "asr_res"]
