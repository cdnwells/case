import logging

from fastapi import APIRouter

from ...models.chat import SendMessageRequest, SendMessageResponse
from ...models.message import Message
from ...services.codex_service import codex_service
from ...services.hub_service import send_commands_to_hub
from ...services.message_parser import parse_message_content

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("", response_model=SendMessageResponse)
async def send_message(request: SendMessageRequest):
    logger.info(request)

    response_content = await codex_service.chat(
        user_content=request.content,
        context=request.context,
    )

    parsed_content, _extracted_memory = parse_message_content(response_content)

    commands_sent = False
    execution_id = None
    if parsed_content.commands:
        commands_sent, execution_id = await send_commands_to_hub(parsed_content.commands)
        logger.info(f"Commands sent to hub: {commands_sent}, executionId: {execution_id}")

    execution_status = None
    has_commands = False
    if parsed_content.commands:
        has_commands = True
        execution_status = "queued" if commands_sent else "failed"

    message = Message(
        content=parsed_content.text,
        role="assistant",
        status="sent",
        parsed_content=parsed_content,
        execution_status=execution_status,
        has_commands=has_commands,
        execution_id=execution_id,
    )

    return SendMessageResponse(message=message)
