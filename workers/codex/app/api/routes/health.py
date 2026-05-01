from fastapi import APIRouter
from datetime import datetime
from ...models.command import HealthResponse
from ...services.codex_service import codex_service
from ...config import settings

router = APIRouter()


@router.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint with Codex CLI availability"""
    return HealthResponse(
        status="ok",
        codex_available=codex_service.is_codex_available(),
        codex_path=settings.CODEX_PATH,
        timestamp=datetime.utcnow().isoformat(),
        version="1.0.0",
    )
