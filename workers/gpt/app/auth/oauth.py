from fastapi import HTTPException, Depends
from fastapi.security import OAuth2PasswordBearer
from typing import Optional
import httpx
from ..config import settings

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token", auto_error=False)


async def verify_oauth_token(
    token: str = Depends(oauth2_scheme),
) -> Optional[dict]:
    """Validate OAuth token with introspection endpoint"""
    if not token:
        return None

    if not settings.OAUTH_INTROSPECTION_URL:
        raise HTTPException(
            status_code=500, detail="OAuth not configured"
        )

    async with httpx.AsyncClient() as client:
        response = await client.get(
            settings.OAUTH_INTROSPECTION_URL,
            headers={"Authorization": f"Bearer {token}"},
        )
        if response.status_code != 200:
            raise HTTPException(status_code=401, detail="Invalid token")
        return response.json()
