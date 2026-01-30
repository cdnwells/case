from pydantic import BaseModel, Field
from typing import Literal, Optional, List
from datetime import datetime
from uuid import uuid4


class ShellCommand(BaseModel):
    """Shell command extracted from GPT response"""

    command: str = Field(..., description="The shell command to execute")
    description: Optional[str] = Field(None, description="Human-readable description")
    working_directory: Optional[str] = Field(
        None, description="Directory to execute in"
    )
    requires_confirmation: bool = Field(
        True, description="Whether user must confirm"
    )
    timeout_seconds: int = Field(
        30, ge=1, le=300, description="Execution timeout"
    )


class MessageContent(BaseModel):
    """Structured message content supporting text and commands"""

    text: str = Field(..., description="The text content of the message")
    commands: Optional[List[ShellCommand]] = Field(
        None, description="Shell commands in the message"
    )


class Message(BaseModel):
    """Message matching Android app's expected format"""

    id: str = Field(default_factory=lambda: f"msg_{uuid4().hex[:12]}")
    content: str = Field(..., description="Message content (may contain command blocks)")
    role: Literal["user", "assistant"] = Field(..., description="Message role")
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    status: Literal["sending", "sent", "error"] = Field(default="sent")
    parsed_content: Optional[MessageContent] = Field(
        None, description="Structured content with extracted commands"
    )


class ChatMessage(BaseModel):
    """OpenAI chat message format"""

    role: Literal["system", "user", "assistant", "developer"] = Field(...)
    content: str = Field(...)
