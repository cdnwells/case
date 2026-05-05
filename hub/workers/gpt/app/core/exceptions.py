from fastapi import HTTPException
from typing import Optional


class ChatException(HTTPException):
    """Base exception for chat-related errors"""

    def __init__(self, detail: str, status_code: int = 500):
        super().__init__(status_code=status_code, detail=detail)


class OpenAIException(ChatException):
    """OpenAI API errors"""

    def __init__(self, detail: str, original_error: Optional[Exception] = None):
        super().__init__(detail=f"OpenAI error: {detail}", status_code=502)
        self.original_error = original_error


class AuthenticationException(ChatException):
    """Authentication failures"""

    def __init__(self, detail: str = "Authentication required"):
        super().__init__(detail=detail, status_code=401)


class RateLimitException(ChatException):
    """Rate limit exceeded"""

    def __init__(self):
        super().__init__(detail="Rate limit exceeded", status_code=429)


class CommandSecurityException(ChatException):
    """Dangerous command detected"""

    def __init__(self, detail: str):
        super().__init__(detail=f"Security: {detail}", status_code=400)
