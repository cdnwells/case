from pydantic import BaseModel, Field
from typing import Optional, List


class CommandRequest(BaseModel):
    command: str = Field(..., min_length=1, max_length=10000)
    timeout: int = Field(default=30, ge=1, le=300)
    working_directory: Optional[str] = None


class CommandResponse(BaseModel):
    success: bool
    stdout: str
    stderr: str
    exit_code: int
    execution_time: float


class ErrorResponse(BaseModel):
    error: str
    message: str
    request_id: Optional[str] = None


class HealthResponse(BaseModel):
    status: str
    codex_available: bool
    codex_path: str
    timestamp: str
    version: str
