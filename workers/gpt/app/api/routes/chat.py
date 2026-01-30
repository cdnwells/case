from fastapi import APIRouter, Depends
from ...models.chat import SendMessageRequest, SendMessageResponse
from ...models.message import Message
from ...services.openai_service import openai_service
from ...services.message_parser import parse_message_content
from ..dependencies import authenticate

router = APIRouter()


@router.post("", response_model=SendMessageResponse)
async def send_message(
    request: SendMessageRequest,
    auth: dict = Depends(authenticate),
):
    """
    Process a chat message through OpenAI GPT.

    Receives messages from the Android app via gateway,
    sends to GPT, and returns response with parsed shell commands.
    """
    # Get response from OpenAI
    response_content = await openai_service.create_chat_response(
        user_content=request.content,
        conversation_history=None,  # TODO: Add conversation history support
    )

    # Parse response for shell commands
    parsed_content = parse_message_content(response_content)

    # Create message matching Android app's expected format
    message = Message(
        content=response_content,
        role="assistant",
        status="sent",
        parsed_content=parsed_content,
    )

    return SendMessageResponse(message=message)
