from chainlit.config import config
from chainlit.context import init_ws_context
from chainlit.extensions.listaction import LA
from chainlit.logger import logger
from chainlit.server import socket


async def process_list_action(action: LA):
    callback = config.code.list_action_callbacks.get(action.name)
    if callback:
        res = await callback(action)
        return res
    else:
        logger.warning("No callback found for list_action %s", action.name)


@socket.on("list_action_call")
async def call_list_action(sid, listAction):
    """Handle an listAction call from the UI."""
    context = init_ws_context(sid)

    action = LA(**listAction)

    try:
        res = await process_list_action(action)
        await context.emitter.send_list_action_response(
            id=action.id, status=True, response=res if isinstance(res, str) else None
        )

    except InterruptedError:
        await context.emitter.send_list_action_response(
            id=action.id, status=False, response="ListAction interrupted by the user"
        )
    except Exception as e:
        logger.exception(e)
        await context.emitter.send_list_action_response(
            id=action.id, status=False, response="An error occured"
        )
