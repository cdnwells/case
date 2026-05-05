from fastapi import HTTPException


class OllamaWorkerException(HTTPException):
    """Base exception for Ollama worker."""

    def __init__(self, status_code: int, detail: str):
        super().__init__(status_code=status_code, detail=detail)


class OllamaException(OllamaWorkerException):
    """Exception for Ollama API errors."""

    def __init__(self, detail: str = "Ollama API error"):
        super().__init__(status_code=502, detail=detail)


class AuthenticationException(OllamaWorkerException):
    """Exception for authentication errors."""

    def __init__(self, detail: str = "Authentication failed"):
        super().__init__(status_code=401, detail=detail)


class ModelNotFoundError(OllamaWorkerException):
    """Exception when the requested model is not found."""

    def __init__(self, model: str):
        super().__init__(status_code=404, detail=f"Model '{model}' not found")
