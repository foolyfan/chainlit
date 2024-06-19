import typing
from dataclasses import dataclass, field
from enum import Enum
from typing import Dict, List, Literal, Optional, TypedDict, Union

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
class GatherCommandResponse(GatherCommandSpec, DataClassJsonMixin):
    code: str
    msg: str
    data: Dict


InputFieldType = Literal["text", "number"]


@dataclass
class InputSpec(DataClassJsonMixin):
    keys: List[str]
    timeout: int
    type: InputFieldType

    placeholder: Optional[str] = None
    rules: Optional[list] = None


class InputResponse(TypedDict):
    value: str
    forId: str
    id: str
    type: Literal["click", "input", "asr_res"]


@dataclass
class UISettingsCommandOptions(DataClassJsonMixin):
    type: str


@dataclass
class BrightnessModeOptions(UISettingsCommandOptions, DataClassJsonMixin):
    mode: Literal["light", "dark"] = "light"
    type: str = "mode"


@dataclass
class FontOptions(UISettingsCommandOptions, DataClassJsonMixin):
    type: str = "font"
    fontSize: Optional[int] = None
    fontFamily: Optional[str] = None


@dataclass
class PSPromptItem(DataClassJsonMixin):
    label: str


@dataclass
class PSMessageItem(DataClassJsonMixin):
    value: dict
    html: Optional[str] = None


@dataclass
class PreselectionSpec(DataClassJsonMixin):
    type: Literal["message", "prompt"]
    items: Union[List[PSPromptItem], List[PSMessageItem]]
