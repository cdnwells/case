from fastapi import HTTPException
from typing import Optional


class SSHWorkerException(HTTPException):
    """Base exception for SSH worker errors"""

    def __init__(self, detail: str, status_code: int = 500):
        super().__init__(status_code=status_code, detail=detail)


class SSHConnectionException(SSHWorkerException):
    """SSH connection errors"""

    def __init__(self, detail: str, original_error: Optional[Exception] = None):
        super().__init__(detail=f"SSH connection error: {detail}", status_code=502)
        self.original_error = original_error


class SSHCommandException(SSHWorkerException):
    """SSH command execution errors"""

    def __init__(self, detail: str, original_error: Optional[Exception] = None):
        super().__init__(detail=f"SSH command error: {detail}", status_code=500)
        self.original_error = original_error


class AuthenticationException(SSHWorkerException):
    """Authentication failures"""

    def __init__(self, detail: str = "Authentication required"):
        super().__init__(detail=detail, status_code=401)


class CommandSecurityException(SSHWorkerException):
    """Dangerous command detected"""

    def __init__(self, detail: str):
        super().__init__(detail=f"Security: {detail}", status_code=400)
