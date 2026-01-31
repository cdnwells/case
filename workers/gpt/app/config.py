from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    # Server
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    DEBUG: bool = False

    # OpenAI
    OPENAI_API_KEY: str = ""
    OPENAI_MODEL: str = "gpt-4o"
    OPENAI_MAX_TOKENS: int = 4096
    OPENAI_TEMPERATURE: float = 0.7

    # Authentication
    API_KEY: str = ""
    OAUTH_ISSUER_URL: Optional[str] = None
    OAUTH_INTROSPECTION_URL: Optional[str] = None
    OAUTH_CLIENT_ID: Optional[str] = None
    OAUTH_CLIENT_SECRET: Optional[str] = None

    # Security
    ALLOWED_ORIGINS: str = "*"
    RATE_LIMIT_REQUESTS: int = 100
    RATE_LIMIT_WINDOW_SECONDS: int = 60

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}

settings = Settings()
