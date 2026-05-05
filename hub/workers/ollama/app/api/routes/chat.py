import json
import logging
import uuid
from typing import Optional

from fastapi import APIRouter, Request
from sse_starlette.sse import EventSourceResponse

from ...models.chat import ChatRequest, ChatResponse
from ...services.message_parser import parse_message_content
from ...services.ollama_service import ollama_service

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("")
async def send_message(
    request: Request,
    chat_request: ChatRequest,
):
    """
    Send a message to the Ollama model.

    Args:
        request: FastAPI request object.
        chat_request: The chat request containing the message.
        auth: Authentication info from dependency.

    Returns:
        ChatResponse with the model's reply and any extracted commands.
    """
    request_id = getattr(request.state, "request_id", str(uuid.uuid4()))
    logger.info(f"[{request_id}] Processing chat request")

    # Build messages list
    messages = [{"role": "user", "content": chat_request.content}]

    if chat_request.stream:
        return await stream_response(messages, chat_request.conversationId)

    # Non-streaming response
    response_content = await ollama_service.chat(messages)

    # Parse the response for commands
    parsed = parse_message_content(response_content)

    return ChatResponse(
        message=parsed.text,
        model=ollama_service.model,
        conversationId=chat_request.conversationId,
        commands=parsed.commands if parsed.commands else None,
    )


async def stream_response(
    messages: list,
    conversation_id: Optional[str] = None,
):
    """
    Stream the response using Server-Sent Events.

    Args:
        messages: The messages to send to the model.
        conversation_id: Optional conversation ID.

    Returns:
        EventSourceResponse for SSE streaming.
    """

    async def event_generator():
        full_content = ""

        async for chunk in ollama_service.chat_stream(messages):
            full_content += chunk
            yield {
                "event": "message",
                "data": json.dumps({"content": chunk, "done": False}),
            }

        # Parse final content for commands
        parsed = parse_message_content(full_content)

        # Send final event with parsed data
        yield {
            "event": "done",
            "data": json.dumps(
                {
                    "content": "",
                    "done": True,
                    "message": parsed.text,
                    "model": ollama_service.model,
                    "conversationId": conversation_id,
                    "commands": [cmd.model_dump() for cmd in parsed.commands]
                    if parsed.commands
                    else None,
                }
            ),
        }

    return EventSourceResponse(event_generator())
