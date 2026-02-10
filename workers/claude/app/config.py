from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    # Server
    HOST: str = "0.0.0.0"
    PORT: int = 8003
    DEBUG: bool = False

    # Claude CLI
    CLAUDE_PATH: str = "/home/cdnwell/.local/bin/claude"
    CLAUDE_DEFAULT_TIMEOUT: int = 30
    CLAUDE_MAX_TIMEOUT: int = 300

    # Security
    ALLOWED_ORIGINS: str = "*"

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()
