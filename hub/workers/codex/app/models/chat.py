from typing import Optional

from pydantic import BaseModel, Field

from .message import Message


class SendMessageRequest(BaseModel):
    content: str = Field(..., min_length=1, max_length=10000)
    conversationId: Optional[str] = None
    context: Optional[str] = None


class SendMessageResponse(BaseModel):
    message: Message


class ErrorResponse(BaseModel):
    error: str
    message: str
    request_id: Optional[str] = None
