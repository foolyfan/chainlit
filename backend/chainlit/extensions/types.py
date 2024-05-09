import typing
from dataclasses import dataclass
from typing import List, Literal

from chainlit.types import ActionSpec, AskSpec
from dataclasses_json import DataClassJsonMixin

from chainlit import logger


@dataclass
class ChoiceActionSpec(ActionSpec):
    layout: List[typing.Dict[Literal["field", "width"], dict]]


@dataclass
class AskChoiceActionSpec(ChoiceActionSpec, AskSpec, DataClassJsonMixin):
    """Specification for asking the user an choice_action"""


GatherCommandType = Literal[
    "capture_idcard", "face_recognition", "password", "custom_card"
]


@dataclass
class GatherCommandSpec(DataClassJsonMixin):
    """Specification for asking the user an choice_action"""

    timeout: int
    type: GatherCommandType
