import logging

from fastapi import APIRouter

from ...services.ollama_service import ollama_service

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/health")
async def health_check():
    """
    Health check endpoint.

    Returns the worker status and Ollama connectivity.
    """
    ollama_status = await ollama_service.check_health()

    return {
        "status": "healthy" if ollama_status.get("ollama_connected") else "degraded",
        "worker": "ollama",
        "ollama": ollama_status,
    }
