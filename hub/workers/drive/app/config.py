from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Server
    HOST: str = "0.0.0.0"
    PORT: int = 8006
    DEBUG: bool = False

    # Google Drive auth
    DRIVE_CREDENTIALS_PATH: str = "credentials.json"
    DRIVE_TOKEN_PATH: str = "token.json"
    DRIVE_ALLOW_INTERACTIVE_AUTH: bool = False

    # Storage
    DRIVE_UPLOAD_PARENT_ID: str = ""
    DRIVE_MAX_FILE_BYTES: int = 10 * 1024 * 1024
    DRIVE_LIST_PAGE_SIZE: int = 25

    # Security
    ALLOWED_ORIGINS: str = "*"

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()
