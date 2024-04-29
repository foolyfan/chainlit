from typing import Any, Callable

from chainlit.config import config
from chainlit.extensions.choiceaction import ChoiceAction
from chainlit.utils import wrap_user_function


def choice_action_callback(name: str) -> Callable:
    """
    Callback to call when an ChoiceAction is clicked in the UI.

    Args:
        func (Callable[[ChoiceAction], Any]): The ChoiceAction callback to execute. First parameter is the ChoiceAction.
    """

    def decorator(func: Callable[[ChoiceAction], Any]):
        config.code.choice_action_callbacks[name] = wrap_user_function(
            func, with_task=True
        )
        return func

    return decorator
