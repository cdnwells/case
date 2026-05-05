from typing import List, Optional

from pydantic import BaseModel


class ShellCommand(BaseModel):
    """Represents a shell command extracted from the response."""

    command: str
    description: Optional[str] = None
    requires_confirmation: bool = False


class MessageContent(BaseModel):
    """Parsed message content with extracted commands."""

    text: str
    commands: List[ShellCommand] = []
