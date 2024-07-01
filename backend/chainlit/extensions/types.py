from dataclasses import dataclass, field
from typing import Dict, Generic, List, Literal, Optional, TypeVar, Union

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


@dataclass
class UISettingsCommandOptions(DataClassJsonMixin):
    type: str


@dataclass
class BrightnessModeOptions(UISettingsCommandOptions, DataClassJsonMixin):
    mode: Literal["light", "dark"] = "light"
    type: str = "mode"


@dataclass
class FontSizeOptions(DataClassJsonMixin):
    type: Literal["add", "reduce"]
    offset: int


@dataclass
class FontOptions(UISettingsCommandOptions, DataClassJsonMixin):
    type: str = "font"
    fontSize: Optional[FontSizeOptions] = None
    fontFamily: Optional[str] = None


@dataclass
class BaseSpec(DataClassJsonMixin):
    """
    消息特性基类

    Attributes：
      __type__ (Literal['ChoiceSpec', 'PreselectionSpec', 'AskSpec', 'InputSpec', 'MessageSpec']): 消息特性的分类，解决前端运行时无法识别类型的问题
    """

    __type__: Literal[
        "ChoiceSpec", "PreselectionSpec", "AskSpec", "InputSpec", "MessageSpec"
    ]


@dataclass
class ListDataItem(DataClassJsonMixin):
    """
    通用列表的条目

    Attributes：
      data (Union[dict, str]): 该展示条目的数据标识，用于大模型从多条目识别指定条目使用
      src (str): 该展示条目的内容或html链接
      display (str): src内容使用的CSS文件内的类名标识
    """

    data: Union[dict, str]
    src: str
    display: str


T = TypeVar("T", bound=ListDataItem)


@dataclass
class ListSpec(Generic[T], BaseSpec, DataClassJsonMixin):
    """
    通用列表，作为消息附加项进行展示

    Attributes：
      items (List[T]): 展示的数据列表，T为ListDataItem的子类即可
    """

    items: List[T]


@dataclass
class PSPromptItem(DataClassJsonMixin):
    """
    输入框辅助提示词条目

    Attributes：
      label (str): 条目的展示内容
    """

    label: str


@dataclass
class PSMessageItem(ListDataItem, DataClassJsonMixin):
    """
    消息的建议列表的条目，执行使用@predefined_procedure(name='taskName')注册的后台任务，使用name区分不同的任务

    Attributes：
      name (str): 钩子函数的参数
    """

    name: str


@dataclass
class PreselectionSpec(ListSpec, DataClassJsonMixin):
    """
    预选项列表

    Attributes：
      type (Literal["message", "prompt"]): 预选项具体的类型，message是消息的建议列表，prompt是输入框提示词列表
      items (List[PSPromptItem], List[PSMessageItem]): 预选项列表数据
    """

    type: Literal["message", "prompt"]

    def __init__(
        self,
        type: Literal["message", "prompt"],
        items: Union[List[PSPromptItem], List[PSMessageItem]],
    ):
        self.type = type
        self.items = items
        self.__type__ = "PreselectionSpec"


@dataclass
class ChoiceItem(ListDataItem, DataClassJsonMixin):
    """
    选择列表条目
    """

    pass


@dataclass
class ChoiceSpec(ListSpec, DataClassJsonMixin):
    """
    选择列表

    Attributes：
      timeout (int): 客户进行选择的超时时间
      items (List[PSPromptItem], List[PSMessageItem]): 选择列表数据
    """

    timeout: int

    def __init__(self, timeout: int, items: List[ChoiceItem]):
        self.timeout = timeout
        self.items = items
        self.__type__ = "ChoiceSpec"


@dataclass
class MessageSpec(BaseSpec, DataClassJsonMixin):
    """
    基础消息

    Attributes：
      actions (Optional[List[Action]]): 执行使用@action_callback(name='taskName')注册的后台任务，使用name区分不同的任务
    """

    actions: Optional[List[Action]]

    def __init__(self, actions: Optional[List[Action]] = None):
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

    def __init__(self, timeout: int, actions: Optional[List[Action]] = None):
        self.timeout = timeout
        self.actions = actions
        self.__type__ = "AskSpec"


@dataclass
class BaseResponse(Generic[T], DataClassJsonMixin):
    """
    通用返回，包括用户语音输入、文本输入、触摸或点击输入

    Attributes：
      type (Literal['keyboard' , 'speech' , 'touch']): 回复方式，键盘输入，语音，触摸或点击
      data (Union[str, T]): 回复内容，包括文本和通用列表条目的data数据
    """

    type: Literal["keyboard", "speech", "touch"]
    data: Union[str, T]
