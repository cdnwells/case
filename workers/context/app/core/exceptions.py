from fastapi import HTTPException


class ContextException(HTTPException):
    """Base exception for context-related errors"""

    def __init__(self, detail: str, status_code: int = 500):
        super().__init__(status_code=status_code, detail=detail)


class StorageException(ContextException):
    """File storage errors"""

    def __init__(self, detail: str):
        super().__init__(detail=f"Storage error: {detail}", status_code=500)
