from fastapi import HTTPException
from typing import Optional


class CodexWorkerException(HTTPException):
    """Base exception for Codex worker errors"""

    def __init__(self, detail: str, status_code: int = 500):
        super().__init__(status_code=status_code, detail=detail)


class CodexBinaryException(CodexWorkerException):
    """Codex CLI binary not found or not executable"""

    def __init__(self, detail: str, original_error: Optional[Exception] = None):
        super().__init__(detail=f"Codex CLI error: {detail}", status_code=503)
        self.original_error = original_error


class CodexCommandException(CodexWorkerException):
    """Codex command execution errors"""

    def __init__(self, detail: str, original_error: Optional[Exception] = None):
        super().__init__(detail=f"Command error: {detail}", status_code=500)
        self.original_error = original_error


class AuthenticationException(CodexWorkerException):
    """Authentication failures"""

    def __init__(self, detail: str = "Authentication required"):
        super().__init__(detail=detail, status_code=401)


class CommandSecurityException(CodexWorkerException):
    """Dangerous command detected"""

    def __init__(self, detail: str):
        super().__init__(detail=f"Security: {detail}", status_code=400)
