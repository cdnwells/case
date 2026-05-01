from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    # Server
    HOST: str = "0.0.0.0"
    PORT: int = 8004
    DEBUG: bool = False

    # Codex CLI
    CODEX_PATH: str = "codex"
    CODEX_MODEL: Optional[str] = None
    CODEX_PROFILE: Optional[str] = None
    CODEX_DEFAULT_TIMEOUT: int = 30
    CODEX_MAX_TIMEOUT: int = 300
    CODEX_CHAT_TIMEOUT: int = 120

    # Security
    ALLOWED_ORIGINS: str = "*"

    # Hub
    HUB_COMMAND_URL: Optional[str] = "http://localhost:5000/command"

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()
