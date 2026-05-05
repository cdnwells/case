import logging
import uuid
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.routes import chat, health
from app.config import settings
from app.models.chat import ErrorResponse
from app.services.ollama_service import ollama_service

# Configure logging
logging.basicConfig(
    level=logging.DEBUG if settings.DEBUG else logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage application lifespan."""
    logger.info(f"Starting Ollama Worker on {settings.HOST}:{settings.PORT}")
    logger.info(f"Using model: {settings.OLLAMA_MODEL}")
    logger.info(f"Ollama URL: {settings.OLLAMA_BASE_URL}")

    # Check Ollama connectivity on startup
    status = await ollama_service.check_health()
    if status.get("ollama_connected"):
        logger.info("Successfully connected to Ollama")
        if status.get("model_available"):
            logger.info(f"Model '{settings.OLLAMA_MODEL}' is available")
        else:
            logger.warning(
                f"Model '{settings.OLLAMA_MODEL}' not found. "
                f"Available models: {status.get('available_models', [])}"
            )
    else:
        logger.warning(f"Could not connect to Ollama: {status.get('error')}")

    yield

    logger.info("Shutting down Ollama Worker...")
    await ollama_service.close()


app = FastAPI(
    title="Ollama Worker",
    description="AI Worker using Ollama for local LLM inference",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS.split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def add_request_id(request: Request, call_next):
    """Add request ID to each request."""
    request_id = request.headers.get("x-request-id", str(uuid.uuid4()))
    request.state.request_id = request_id

    response = await call_next(request)
    response.headers["x-request-id"] = request_id

    return response


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Handle all unhandled exceptions."""
    request_id = getattr(request.state, "request_id", None)
    logger.error(f"[{request_id}] Unhandled exception: {exc}", exc_info=True)

    return JSONResponse(
        status_code=500,
        content=ErrorResponse(
            error="Internal Server Error",
            message="An unexpected error occurred",
            request_id=request_id,
        ).model_dump(),
    )


# Include routers
app.include_router(health.router, tags=["health"])
app.include_router(chat.router, prefix="/chat", tags=["chat"])


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
    )
