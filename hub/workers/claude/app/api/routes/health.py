from fastapi import APIRouter
from datetime import datetime
from ...models.command import HealthResponse
from ...services.claude_service import claude_service
from ...config import settings

router = APIRouter()


@router.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint with Claude CLI availability"""
    return HealthResponse(
        status="ok",
        claude_available=claude_service.is_claude_available(),
        claude_path=settings.CLAUDE_PATH,
        timestamp=datetime.utcnow().isoformat(),
        version="1.0.0",
    )
