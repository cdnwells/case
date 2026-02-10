from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    # Server
    HOST: str = "0.0.0.0"
    PORT: int = 8001
    DEBUG: bool = False

    # SSH
    SSH_HOST: str = ""
    SSH_PORT: int = 22
    SSH_USERNAME: str = ""
    SSH_KEY_PATH: str = ""
    SSH_KEY_PASSPHRASE: Optional[str] = None

    # Authentication
    API_KEY: str = ""

    # Security
    ALLOWED_ORIGINS: str = "*"

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()
