import json
from typing import ClassVar, List, Literal, Optional

from chainlit.element import Element, ElementType, Text
from pydantic.dataclasses import Field, dataclass


@dataclass
class DataItem:
    value: str
    label: str
    width: Literal["half", "all"] = "half"
    forId: Optional[str] = None


@dataclass
class PreviewInfoGroup(Text):
    title: str = ""
    items: List[DataItem] = Field(default_factory=List[DataItem], exclude=True)
    mime: str = "application/json"
    type: ClassVar[ElementType] = "previewinfogroup"
    content: str = "dummy content to pass validation"
    display: Literal["inline", "side", "page"] = "inline"

    async def send(self, for_id):
        self.preprocess_content()
        await super().send(for_id)

    def preprocess_content(self):
        # serialize enum
        items = [
            {
                "value": item.value,
                "label": item.label,
                "width": item.width,
                "forId": item.forId,
            }
            for item in self.items
        ]

        # store stringified json in content so that it's correctly stored in the database
        self.content = json.dumps(
            {
                "items": items,
            },
            indent=4,
            ensure_ascii=False,
        )
