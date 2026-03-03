from fastapi import APIRouter
from ...models.chat import SendMessageRequest, SendMessageResponse
from ...models.message import Message
from ...services.openai_service import openai_service
from ...services.message_parser import parse_message_content
from ...services.hub_service import send_commands_to_hub
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter()

@router.post("")
async def send_message(
    request: SendMessageRequest,
):
    """
    Process a chat message through OpenAI GPT.

    Receives messages from the Android app via hub,
    sends to GPT, and returns response with parsed shell commands.
    Commands are extracted and sent to the hub separately.
    """

    logger.info(request)

    # Get response from OpenAI (with context if available)
    response_content = await openai_service.create_chat_response(
        user_content=request.content,
        conversation_history=None,
        context=request.context,
    )

    # Parse response and pass user request for action detection
    parsed_content, extracted_memory = parse_message_content(
        response_content, user_request=request.content
    )

    # Send commands to hub if any were extracted
    commands_sent = False
    execution_id = None
    if parsed_content.commands:
        commands_sent, execution_id = await send_commands_to_hub(parsed_content.commands)
        logger.info(f"Commands sent to hub: {commands_sent}, executionId: {execution_id}")

    # Determine execution status
    execution_status = None
    has_commands = False
    if parsed_content.commands:
        has_commands = True
        execution_status = "queued" if commands_sent else "failed"

    # Create message matching Android app's expected format
    # Use cleaned text (without command blocks) as content
    message = Message(
        content=parsed_content.text,
        role="assistant",
        status="sent",
        parsed_content=parsed_content,
        execution_status=execution_status,
        has_commands=has_commands,
        execution_id=execution_id,
    )

    response_data = SendMessageResponse(message=message).model_dump(by_alias=True)

    # Attach extracted memory to response for hub to save
    if extracted_memory:
        response_data["memory"] = extracted_memory

    return response_data
