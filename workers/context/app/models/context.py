from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from uuid import uuid4


class Memory(BaseModel):
    """A single extracted memory/fact"""

    id: str = Field(default_factory=lambda: f"mem_{uuid4().hex[:12]}")
    content: str = Field(..., description="The memory content")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    source: str = Field(default="gpt", description="Which worker created this memory")


class MemoriesRequest(BaseModel):
    """Request to save new memories"""

    memories: List[str] = Field(..., description="List of memory strings to save")
    source: str = Field(default="gpt")


class ContextResponse(BaseModel):
    """Formatted context for LLM injection"""

    context: str = Field(..., description="Formatted context string for system prompt")
    memory_count: int = Field(..., description="Number of memories")


class MemoryListResponse(BaseModel):
    """List of all stored memories"""

    memories: List[Memory]
    total: int


class ErrorResponse(BaseModel):
    """Standard error response"""

    error: str
    message: str
    request_id: Optional[str] = None
