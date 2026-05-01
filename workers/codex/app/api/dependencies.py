from fastapi import Depends, HTTPException
from fastapi.security import APIKeyHeader
from ..config import settings

api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)


async def authenticate(api_key: str = Depends(api_key_header)) -> dict:
    """Authenticate via API key"""
    if not api_key:
        raise HTTPException(
            status_code=401,
            detail="Authentication required (API key)",
        )

    if api_key != settings.API_KEY:
        raise HTTPException(status_code=403, detail="Invalid API key")

    return {"auth_type": "api_key"}
