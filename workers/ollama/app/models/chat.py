from typing import List, Optional

from pydantic import BaseModel, Field

from .message import ShellCommand


class ChatRequest(BaseModel):
    """Request model for chat endpoint."""

    content: str = Field(..., min_length=1, max_length=10000)
    conversationId: Optional[str] = Field(None, description="Conversation ID for context")
    stream: bool = Field(default=False, description="Enable streaming response")


class ChatResponse(BaseModel):
    """Response model for chat endpoint."""

    message: str
    model: str
    conversationId: Optional[str] = None
    commands: Optional[List[ShellCommand]] = None


class StreamChunk(BaseModel):
    """Model for streaming response chunks."""

    content: str
    done: bool = False


class ErrorResponse(BaseModel):
    """Error response model."""

    error: str
    message: str
    request_id: Optional[str] = None
