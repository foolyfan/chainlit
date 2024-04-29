from chainlit.config import config
from chainlit.context import init_ws_context
from chainlit.extensions.choiceaction import ChoiceAction
from chainlit.logger import logger
from chainlit.server import socket


async def process_choice_ction(action: ChoiceAction):
    callback = config.code.choice_action_callbacks.get(action.name)
    if callback:
        res = await callback(action)
        return res
    else:
        logger.warning("No callback found for choice_action %s", action.name)


@socket.on("choice_action_call")
async def call_choice_action(sid, choiceAction):
    """Handle an choiceAction call from the UI."""
    context = init_ws_context(sid)

    action = ChoiceAction(**choiceAction)

    try:
        res = await process_choice_ction(action)
        await context.emitter.send_choice_action_response(
            id=action.id, status=True, response=res if isinstance(res, str) else None
        )

    except InterruptedError:
        await context.emitter.send_choice_action_response(
            id=action.id, status=False, response="ChoiceAction interrupted by the user"
        )
    except Exception as e:
        logger.exception(e)
        await context.emitter.send_choice_action_response(
            id=action.id, status=False, response="An error occured"
        )
