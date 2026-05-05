from fastapi import Depends, Request
from fastapi.security import APIKeyHeader

from ..config import settings
from ..core.exceptions import AuthenticationException

api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)


async def authenticate(
    request: Request,
    api_key: str = Depends(api_key_header),
) -> dict:
    """
    Authenticate the request using API key.

    Args:
        request: The FastAPI request object.
        api_key: API key from the X-API-Key header.

    Returns:
        Authentication info dict.

    Raises:
        AuthenticationException: If authentication fails.
    """
    if not api_key:
        raise AuthenticationException("API key required")

    if api_key != settings.API_KEY:
        raise AuthenticationException("Invalid API key")

    return {
        "auth_type": "api_key",
        "request_id": getattr(request.state, "request_id", None),
    }
