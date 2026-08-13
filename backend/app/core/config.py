from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional

class Settings(BaseSettings):
    # Database
    DATABASE_URL: str
    DATABASE_ECHO: bool = False

    # Authentication
    JWT_SECRET_KEY: str
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    JWT_REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # Storage
    STORAGE_PROVIDER: str = "local"  # "local" | "bunny" | "minio" | "s3"
    LOCAL_STORAGE_DIR: str = "data/storage"
    STORAGE_ENDPOINT_URL: Optional[str] = None
    STORAGE_ACCESS_KEY: Optional[str] = None
    STORAGE_SECRET_KEY: Optional[str] = None
    STORAGE_BUCKET_NAME: Optional[str] = None
    STORAGE_REGION: Optional[str] = "de"
    STORAGE_CDN_URL: Optional[str] = None

    # LLM
    LLM_PROVIDER: str = "openai"
    LLM_API_KEY: str
    LLM_BASE_URL: Optional[str] = None
    LLM_DEFAULT_MODEL: str = "gpt-4o"

    # App
    APP_ENV: str = "development"
    CORS_ORIGINS: str = "http://localhost:3000"
    BACKEND_URL: str = "http://localhost:8000"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )

settings = Settings()
