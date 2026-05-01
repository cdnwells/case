from datetime import datetime
from typing import List, Literal, Optional
from uuid import uuid4

from pydantic import BaseModel, ConfigDict, Field


def to_camel(string: str) -> str:
    components = string.split("_")
    return components[0] + "".join(x.title() for x in components[1:])


class ShellCommand(BaseModel):
    command: str = Field(..., description="The command instruction to execute")
    description: Optional[str] = Field(None, description="Human-readable description")
    working_directory: Optional[str] = None
    requires_confirmation: bool = False
    timeout_seconds: int = Field(120, ge=1, le=300)


class MessageContent(BaseModel):
    text: str
    commands: Optional[List[ShellCommand]] = None


class Message(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    id: str = Field(default_factory=lambda: f"msg_{uuid4().hex[:12]}")
    content: str
    role: Literal["user", "assistant"]
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    status: Literal["sending", "sent", "error"] = "sent"
    parsed_content: Optional[MessageContent] = None
    execution_status: Optional[Literal["queued", "executing", "completed", "failed"]] = None
    has_commands: Optional[bool] = None
    execution_id: Optional[str] = None
