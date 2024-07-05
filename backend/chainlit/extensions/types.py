from dataclasses import dataclass
from enum import Enum
from typing import Dict, Generic, List, Literal, Optional, TypedDict, TypeVar, Union

from chainlit.action import Action
from dataclasses_json import DataClassJsonMixin

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


class FontSizeParameters(TypedDict):
    offset: int


class JsFunction(TypedDict):
    name: Literal["dark_style", "light_style", "add_font_size", "reduce_font_size"]
    parameters: Optional[Union[FontSizeParameters, Dict]]


@dataclass
class ChoiceWidget(DataClassJsonMixin):
    """
    用户选择列表小部件

    Attributes：:
      __type__ (Literal["button"]): 小部件类型
      data (Union[dict,str]): 该展示小部件的数据标识，用户操作后作为textReply的参数传递
    """

    __type__: Literal["button"]
    data: Union[dict, str]


SubChoiceWidget = TypeVar("SubChoiceWidget", bound="ChoiceWidget")


@dataclass
class ButtonWidget(ChoiceWidget, DataClassJsonMixin):
    label: str

    def __init__(self, label: str, data: Union[dict, str]):
        self.__type__ = "button"
        self.label = label
        self.data = data


@dataclass
class CustomizeHtmlContent(DataClassJsonMixin):
    """
    定制的html内容

    Attributes：
      src (str): 内容或html链接
      display (str): html内容使用的CSS文件内的类名标识
    """

    src: str
    display: str


@dataclass
class MdLink(CustomizeHtmlContent, DataClassJsonMixin):
    """
    Md的link展示的内容

    Attributes：
      data (str): Md的link格式中，方括号包裹的内容；例子，[example](http://www.example1.com)，为example
      src (str): html形式的协议内容
      display (str)：html使用的CSS文件内的类名标识
    """

    data: str


@dataclass
class ListDataItem(CustomizeHtmlContent, DataClassJsonMixin):
    """
    通用列表的条目

    Attributes：
      data (Union[dict, str]): 该展示条目的数据标识，该条目被用户选中后会被作为上下文参数传递到后续处理逻辑
      src (str): 该展示条目的内容或html链接
      display (str): src内容使用的CSS文件内的类名标识
    """

    data: Union[dict, str]


SubListDataItem = TypeVar("SubListDataItem", bound=ListDataItem)


@dataclass
class BaseSpec(DataClassJsonMixin):
    """
    消息特性基类

    Attributes：
      __type__ (Literal['ChoiceSpec', 'PreselectionSpec', 'AskSpec', 'InputSpec', 'MessageSpec']): 消息特性的分类，解决前端运行时无法识别类型的问题
    """

    __type__: Literal[
        "ChoiceSpec",
        "PreselectionSpec",
        "AskSpec",
        "InputSpec",
        "MessageSpec",
        "CheckSpec",
    ]
    mdLinks: Optional[List[MdLink]]


@dataclass
class ListSpec(Generic[SubListDataItem], BaseSpec, DataClassJsonMixin):
    """
    通用列表，作为消息附加项进行展示

    Attributes：
      items (List[T]): 展示的数据列表，T为ListDataItem的子类即可
    """

    items: List[SubListDataItem]


@dataclass
class PSInputItem(DataClassJsonMixin):
    """
    输入框辅助提示词条目

    Attributes：
      label (str): 条目的展示内容
    """

    label: str


@dataclass
class PSMessageItem(ListDataItem, DataClassJsonMixin):
    """
    消息的建议列表的条目，执行使用@predefined_procedure注解的函数

    Attributes：
      data (Union[dict, str]): 该展示条目的数据标识，用户选中后data作为@predefined_procedure注解的函数参数传递
    """


@dataclass
class PreselectionSpec(ListSpec, DataClassJsonMixin):
    """
    预选项列表

    Attributes：
      type (Literal["message", "prompt"]): 预选项具体的类型，message是消息的建议列表，prompt是输入框提示词列表
      items (List[PSInputItem], List[PSMessageItem]): 预选项列表数据
    """

    type: Literal["message", "input"]

    def __init__(
        self,
        type: Literal["message", "input"],
        items: Union[List[PSInputItem], List[PSMessageItem]],
        mdLinks: Optional[List[MdLink]] = None,
    ):
        self.type = type
        self.items = items
        self.mdLinks = mdLinks
        self.__type__ = "PreselectionSpec"


@dataclass
class ChoiceItem(ListDataItem, DataClassJsonMixin):
    """
    选择列表条目

    Attributes：
      data (Union[dict, str]): 该展示条目的数据标识，用户选中后作为textReply的参数传递
    """

    pass


@dataclass
class ChoiceSpec(ListSpec, DataClassJsonMixin):
    """
    选择列表

    Attributes：
      timeout (int): 客户进行选择的超时时间
      items (List[PSInputItem], List[PSMessageItem]): 选择列表数据
    """

    timeout: int
    widgets: Optional[List[ButtonWidget]]

    def __init__(
        self,
        timeout: int,
        items: List[ChoiceItem],
        widgets: Optional[List[ButtonWidget]] = None,
    ):
        self.timeout = timeout
        self.items = items
        self.widgets = widgets
        self.__type__ = "ChoiceSpec"


@dataclass
class MessageSpec(BaseSpec, DataClassJsonMixin):
    """
    基础消息

    Attributes：
      actions (Optional[List[Action]]): 执行使用@action_callback(name='taskName')注册的后台任务，使用name区分不同的任务
    """

    actions: Optional[List[Action]]

    def __init__(
        self,
        actions: Optional[List[Action]] = None,
        mdLinks: Optional[List[MdLink]] = None,
    ):
        self.mdLinks = mdLinks
        self.actions = actions
        self.__type__ = "MessageSpec"


InputFieldType = Literal["text", "number"]


@dataclass
class InputSpec(MessageSpec, DataClassJsonMixin):
    timeout: int
    type: InputFieldType
    placeholder: Optional[str] = None
    rules: Optional[List] = None

    def __init__(
        self,
        timeout: int,
        type: InputFieldType,
        placeholder: Optional[str] = None,
        rules: Optional[List] = None,
        actions: Optional[List[Action]] = None,
    ):
        self.timeout = timeout
        self.type = type
        self.placeholder = placeholder
        self.rules = rules
        self.actions = actions
        self.mdLinks = None
        self.__type__ = "InputSpec"


@dataclass
class AskSpec(MessageSpec, DataClassJsonMixin):
    """
    询问或要求客户回复的消息

    Attributes：
      timeout (int): 回复的超时时间
      actions (Optional[List[Action]]): 可使用的回复按钮列表
    """

    timeout: int

    def __init__(
        self,
        timeout: int,
        actions: Optional[List[Action]] = None,
        mdLinks: Optional[List[MdLink]] = None,
    ):
        self.mdLinks = mdLinks
        self.timeout = timeout
        self.actions = actions
        self.__type__ = "AskSpec"


@dataclass
class CheckSpec(AskSpec, DataClassJsonMixin):

    mdAgreementLinks: List[MdLink]

    def __init__(
        self,
        timeout: int,
        mdAgreementLinks: List[MdLink],
        actions: Optional[List[Action]] = None,
        mdLinks: Optional[List[MdLink]] = None,
    ):
        self.timeout = timeout
        self.actions = actions
        self.mdAgreementLinks = mdAgreementLinks
        self.mdLinks = mdLinks
        self.__type__ = "CheckSpec"


@dataclass
class BaseResponse(Generic[SubListDataItem], DataClassJsonMixin):
    """
    通用返回，包括用户语音输入、文本输入、触摸或点击输入

    Attributes：
      type (Literal['keyboard' , 'speech' , 'touch']): 回复方式，键盘输入，语音，触摸或点击
      data (Union[str, SubListDataItem]): 回复内容，包括文本和通用列表条目的data数据
    """

    type: Literal["keyboard", "speech", "touch"]
    data: Union[str, SubListDataItem]


class JsInterfaceEnum(Enum):
    AGREEMENT_DRAWER = "/local/showAgreementDrawer"
    PREVIEW_DRAWER = "/local/showPreviewDrawer"
