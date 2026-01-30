from pydantic import BaseModel, Field
from typing import Optional, List
from .message import Message, ChatMessage


class SendMessageRequest(BaseModel):
    """Request from Android app via gateway"""

    content: str = Field(..., min_length=1, max_length=10000)
    conversationId: Optional[str] = Field(
        None, description="Conversation context ID"
    )


class SendMessageResponse(BaseModel):
    """Response matching Android app's expected format"""

    message: Message


class ChatCompletionRequest(BaseModel):
    """Internal request for OpenAI API"""

    messages: List[ChatMessage]
    model: str = Field(default="gpt-4o")
    max_tokens: Optional[int] = Field(default=4096)
    temperature: float = Field(default=0.7, ge=0, le=2)


class ErrorResponse(BaseModel):
    """Standard error response"""

    error: str
    message: str
    request_id: Optional[str] = None
