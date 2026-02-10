from fastapi import APIRouter
from datetime import datetime
from ...services.ssh_service import ssh_service
from ...models.command import HealthResponse

router = APIRouter()


@router.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint with SSH connection status"""
    return HealthResponse(
        status="ok",
        ssh_connected=ssh_service.is_connected(),
        timestamp=datetime.utcnow().isoformat(),
        version="1.0.0",
    )
