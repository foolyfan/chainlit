import asyncio
import uuid
from typing import Any, Dict, Literal, Optional, Type, TypeVar, cast

from chainlit.data import get_data_layer
from chainlit.extensions.types import (
    BaseResponse,
    BaseSpec,
    GatherCommandResponse,
    GatherCommandSpec,
    InputSpec,
    MessageSpec,
    PreselectionSpec,
    UISettingsCommandOptions,
)
from chainlit.logger import logger
from chainlit.message import Message
from chainlit.session import BaseSession, WebsocketSession
from chainlit.step import StepDict
from chainlit.types import ThreadDict, UIMessagePayload
from chainlit.user import PersistedUser
from literalai.helper import utc_now
from socketio.exceptions import TimeoutError

BS = TypeVar("BS", bound="BaseSpec")


class BaseChainlitEmitter:
    """
    Chainlit Emitter Stub class. This class is used for testing purposes.
    It stubs the ChainlitEmitter class and does nothing on function calls.
    """

    session: BaseSession

    def __init__(self, session: BaseSession) -> None:
        """Initialize with the user session."""
        self.session = session

    async def emit(self, event: str, data: Any):
        """Stub method to get the 'emit' property from the session."""
        pass

    async def emit_call(self):
        """Stub method to get the 'emit_call' property from the session."""
        pass

    async def resume_thread(self, thread_dict: ThreadDict):
        """Stub method to resume a thread."""
        pass

    async def send_step(self, step_dict: StepDict, spec: MessageSpec):
        """Stub method to send a message to the UI."""
        pass

    async def update_step(self, step_dict: StepDict):
        """Stub method to update a message in the UI."""
        pass

    async def delete_step(self, step_dict: StepDict):
        """Stub method to delete a message in the UI."""
        pass

    def send_timeout(
        self,
        event: Literal["ask_timeout", "gather_command_timeout", "call_fn_timeout"],
        data: Optional[dict],
    ):
        """Stub method to send a timeout to the UI."""
        pass

    def clear(
        self,
        event: Literal[
            "clear_ask",
            "clear_gather_command",
            "clear_call_fn",
            "clear_input",
            "clear_prompt_advise",
        ],
        data: Optional[dict] = None,
    ):
        pass

    async def init_thread(self, interaction: str):
        pass

    async def process_user_message(self, payload: UIMessagePayload) -> Message:
        """Stub method to process user message."""
        return Message(content="")

    async def ask_user(
        self, step_dict: StepDict, spec: BS, timeout: int
    ) -> Optional[BaseResponse]:
        """Stub method to send a prompt to the UI and wait for a response."""
        pass

    async def send_input(
        self, step_dict: StepDict, spec: InputSpec, timeout: int
    ) -> Optional[BaseResponse]:
        pass

    async def update_input(
        self, step_dict: StepDict, spec: InputSpec, timeout: int
    ) -> Optional[BaseResponse]:
        pass

    async def send_call_fn(
        self, name: str, args: Dict[str, Any], timeout=300, raise_on_timeout=False
    ) -> Optional[Dict[str, Any]]:
        """Stub method to send a call function event to the copilot and wait for a response."""
        pass

    async def update_token_count(self, count: int):
        """Stub method to update the token count for the UI."""
        pass

    async def task_start(self):
        """Stub method to send a task start signal to the UI."""
        pass

    async def task_end(self):
        """Stub method to send a task end signal to the UI."""
        pass

    async def stream_start(self, step_dict: StepDict):
        """Stub method to send a stream start signal to the UI."""
        pass

    async def send_token(self, id: str, token: str, is_sequence=False):
        """Stub method to send a message token to the UI."""
        pass

    async def set_chat_settings(self, settings: dict):
        """Stub method to set chat settings."""
        pass

    async def gather_command(
        self, step_dict: StepDict, spec: GatherCommandSpec, raise_on_timeout=False
    ):
        pass

    async def change_theme(self, step_dict: StepDict, spec: UISettingsCommandOptions):
        pass

    async def advise(self, step_dict: StepDict, spec: PreselectionSpec):
        pass

    async def send_action_response(
        self, id: str, status: bool, response: Optional[str] = None
    ):
        """Send an action response to the UI."""
        pass

    async def send_list_action_response(
        self, id: str, status: bool, response: Optional[str] = None
    ):
        """Send an list_action response to the UI."""
        pass


class ChainlitEmitter(BaseChainlitEmitter):
    """
    Chainlit Emitter class. The Emitter is not directly exposed to the developer.
    Instead, the developer interacts with the Emitter through the methods and classes exposed in the __init__ file.
    """

    session: WebsocketSession

    def __init__(self, session: WebsocketSession) -> None:
        """Initialize with the user session."""
        self.session = session

    def _get_session_property(self, property_name: str, raise_error=True):
        """Helper method to get a property from the session."""
        if not hasattr(self, "session") or not hasattr(self.session, property_name):
            if raise_error:
                raise ValueError(f"Session does not have property '{property_name}'")
            else:
                return None
        return getattr(self.session, property_name)

    @property
    def emit(self):
        """Get the 'emit' property from the session."""

        return self._get_session_property("emit")

    @property
    def emit_call(self):
        """Get the 'emit_call' property from the session."""
        return self._get_session_property("emit_call")

    def resume_thread(self, thread_dict: ThreadDict):
        """Send a thread to the UI to resume it"""
        return self.emit("resume_thread", thread_dict)

    def send_step(self, step_dict: StepDict, spec: MessageSpec):
        """Send a message to the UI."""
        return self.emit("new_message", {"msg": step_dict, "spec": spec.to_dict()})

    def update_step(self, step_dict: StepDict):
        """Update a message in the UI."""
        return self.emit("update_message", step_dict)

    def delete_step(self, step_dict: StepDict):
        """Delete a message in the UI."""
        return self.emit("delete_message", step_dict)

    def send_timeout(
        self,
        event: Literal[
            "ask_timeout", "gather_command_timeout", "call_fn_timeout", "input_timeout"
        ],
        data: Optional[dict] = None,
    ):
        return self.emit(event, data)

    def clear(
        self,
        event: Literal[
            "clear_ask",
            "clear_gather_command",
            "clear_call_fn",
            "clear_input",
            "clear_prompt_advise",
        ],
        data: Optional[dict] = None,
    ):
        return self.emit(event, data)

    async def flush_thread_queues(self, interaction: str):
        if data_layer := get_data_layer():
            if isinstance(self.session.user, PersistedUser):
                user_id = self.session.user.id
            else:
                user_id = None
            try:
                await data_layer.update_thread(
                    thread_id=self.session.thread_id,
                    name=interaction,
                    user_id=user_id,
                )
            except Exception as e:
                logger.error(f"Error updating thread: {e}")
            await self.session.flush_method_queue()

    async def init_thread(self, interaction: str):
        await self.flush_thread_queues(interaction)
        await self.emit("first_interaction", interaction)

    async def process_user_message(self, payload: UIMessagePayload):
        step_dict = payload["message"]
        # file_refs = payload["fileReferences"]
        # UUID generated by the frontend should use v4
        assert uuid.UUID(step_dict["id"]).version == 4

        message = Message.from_dict(step_dict)
        # Overwrite the created_at timestamp with the current time
        message.created_at = utc_now()

        asyncio.create_task(message._create())

        if not self.session.has_first_interaction:
            self.session.has_first_interaction = True
            asyncio.create_task(self.init_thread(message.content))

        # if file_refs:
        #     files = [
        #         self.session.files[file["id"]]
        #         for file in file_refs
        #         if file["id"] in self.session.files
        #     ]
        #     file_elements = [Element.from_dict(file) for file in files]
        #     message.elements = file_elements

        #     async def send_elements():
        #         for element in message.elements:
        #             await element.send(for_id=message.id)

        #     asyncio.create_task(send_elements())

        self.session.root_message = message

        return message

    async def ask_user(
        self, step_dict: StepDict, spec: BS, timeout: int
    ) -> BaseResponse:
        try:
            res = await self.emit_call(
                "ask", {"msg": step_dict, "spec": spec.to_dict()}, timeout
            )
            return BaseResponse(**res)
        except TimeoutError as e:
            await self.send_timeout("ask_timeout", {"msg": step_dict})
            raise e

    async def send_call_fn(
        self, name: str, args: Dict[str, Any], timeout=300, raise_on_timeout=False
    ) -> Optional[Dict[str, Any]]:
        """Stub method to send a call function event to the copilot and wait for a response."""
        try:
            call_fn_res = await self.emit_call(
                "call_fn", {"name": name, "args": args}, timeout
            )  # type: Dict

            await self.clear("clear_call_fn")
            return call_fn_res
        except TimeoutError as e:
            await self.send_timeout("call_fn_timeout")

            if raise_on_timeout:
                raise e
            return None

    async def send_input(self, step_dict: StepDict, spec: InputSpec, timeout: int):
        res = None
        try:
            res = await self.emit_call(
                "input", {"msg": step_dict, "spec": spec.to_dict()}, timeout
            )
            return BaseResponse(**res)
        except TimeoutError:
            await self.send_timeout("input_timeout", {"msg": step_dict})
            return res
        except asyncio.CancelledError as e:
            raise e

    async def update_input(self, step_dict: StepDict, spec: InputSpec, timeout: int):
        res = None
        try:
            res = await self.emit_call(
                "update_input", {"msg": step_dict, "spec": spec.to_dict()}, timeout
            )
            return BaseResponse(**res)
        except TimeoutError as e:
            await self.send_timeout("input_timeout", {"msg": step_dict})
            return res
        except asyncio.CancelledError as e:
            raise e

    def update_token_count(self, count: int):
        """Update the token count for the UI."""

        return self.emit("token_usage", count)

    async def gather_command(
        self, step_dict: StepDict, spec: GatherCommandSpec, raise_on_timeout=False
    ):
        try:
            # Send the prompt to the UI
            user_res = await self.emit_call(
                "gather_command",
                {"msg": step_dict, "spec": spec.to_dict()},
                spec.timeout,
            )
            await self.task_end()
            final_res = cast(GatherCommandResponse, user_res)
            await self.clear("clear_gather_command")
            return final_res
        except TimeoutError as e:
            await self.send_timeout("gather_command_timeout")

            if raise_on_timeout:
                raise e
        except asyncio.CancelledError as e:
            raise e

    def task_start(self):
        """
        Send a task start signal to the UI.
        """
        return self.emit("task_start", {})

    def task_end(self):
        """Send a task end signal to the UI."""
        return self.emit("task_end", {})

    def stream_start(self, step_dict: StepDict):
        """Send a stream start signal to the UI."""
        return self.emit(
            "stream_start",
            step_dict,
        )

    def send_token(self, id: str, token: str, is_sequence=False):
        """Send a message token to the UI."""
        return self.emit(
            "stream_token", {"id": id, "token": token, "isSequence": is_sequence}
        )

    def set_chat_settings(self, settings: Dict[str, Any]):
        self.session.chat_settings = settings

    def send_action_response(
        self, id: str, status: bool, response: Optional[str] = None
    ):
        return self.emit(
            "action_response", {"id": id, "status": status, "response": response}
        )

    def send_list_action_response(
        self, id: str, status: bool, response: Optional[str] = None
    ):
        return self.emit(
            "list_action_response", {"id": id, "status": status, "response": response}
        )

    def change_theme(self, step_dict: StepDict, spec: UISettingsCommandOptions):
        return self.emit(
            "change_theme",
            {"msg": step_dict, "spec": spec.to_dict()},
        )

    def advise(self, step_dict: StepDict, spec: PreselectionSpec):
        return self.emit(
            "advise",
            {"msg": step_dict, "spec": spec.to_dict()},
        )
