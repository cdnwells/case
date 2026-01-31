from fastapi import Depends, HTTPException
from ..auth.api_key import api_key_header
from ..auth.oauth import oauth2_scheme, verify_oauth_token
from ..config import settings


async def authenticate(
    api_key: str = Depends(api_key_header),
    oauth_token: str = Depends(oauth2_scheme),
) -> dict:
    """Accept either API key or OAuth token"""

    # Check API key first (from gateway)
    if api_key:
        if api_key == settings.API_KEY or api_key == settings.OPENAI_API_KEY:
            return {"auth_type": "api_key", "source": "gateway"}
        raise HTTPException(status_code=403, detail="Invalid API key")

    # Check OAuth token
    if oauth_token:
        user_info = await verify_oauth_token(oauth_token)
        if user_info:
            return {"auth_type": "oauth", "user": user_info}

    raise HTTPException(
        status_code=401,
        detail="Authentication required (API key or OAuth token)",
    )
