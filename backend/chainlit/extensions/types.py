import typing
from dataclasses import dataclass
from typing import List, Literal

from chainlit.types import ActionSpec, AskSpec
from dataclasses_json import DataClassJsonMixin

from chainlit import logger


@dataclass
class ChoiceActionSpec(ActionSpec):
    layout: List[typing.Dict[Literal["field", "name"], dict]]


@dataclass
class AskChoiceActionSpec(ChoiceActionSpec, AskSpec, DataClassJsonMixin):
    """Specification for asking the user an choice_action"""
