from pydantic import BaseModel, Field
from typing import Optional, Literal
from enum import Enum


class CommandType(str, Enum):
    SHELL = "shell"
    SSH = "ssh"
    FILE_OPERATION = "file_operation"


class CommandExecutionRequest(BaseModel):
    """Request to execute a command (for future SSH worker)"""

    command_id: str
    command: str
    command_type: CommandType = CommandType.SHELL
    target_host: Optional[str] = Field(
        None, description="SSH target for remote commands"
    )
    working_directory: Optional[str] = None
    timeout_seconds: int = Field(30, ge=1, le=300)
    user_confirmed: bool = Field(
        False, description="User explicitly confirmed execution"
    )


class CommandExecutionResult(BaseModel):
    """Result from command execution"""

    command_id: str
    status: Literal["pending", "running", "completed", "failed", "cancelled"]
    exit_code: Optional[int] = None
    stdout: Optional[str] = None
    stderr: Optional[str] = None
    execution_time_ms: Optional[int] = None
