from typing import Any, Callable

from chainlit.config import config
from chainlit.extensions.listaction import LA
from chainlit.utils import wrap_user_function


def list_action_callback(name: str) -> Callable:

    def decorator(func: Callable[[LA], Any]):
        config.code.list_action_callbacks[name] = wrap_user_function(
            func, with_task=True
        )
        return func

    return decorator
