"""NammaKural application configuration."""

from pydantic_settings import BaseSettings
from functools import lru_cache
import os


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # App details
    APP_NAME: str = "Our voice"
    APP_VERSION: str = "0.1.0"
    API_V1_STR: str = "/api/v1"
    DEBUG: bool = True

    # Database
    DATABASE_URL: str = "sqlite:///./nammakural.db"

    # Auth
    SECRET_KEY: str = "nammakural-hackathon-secret-key-2024"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480  # 8 hours for demo

    # Gemini AI
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-2.0-flash"
    GEMINI_EMBEDDING_MODEL: str = "text-embedding-004"

    # File uploads
    UPLOAD_DIR: str = "./uploads"
    MAX_UPLOAD_SIZE: int = 50 * 1024 * 1024  # 50MB

    # CORS
    CORS_ORIGINS: str = "http://localhost:3000"

    # Confidence thresholds
    CONFIDENCE_THRESHOLD_HIGH: float = 0.8
    CONFIDENCE_THRESHOLD_MEDIUM: float = 0.6
    CONFIDENCE_THRESHOLD_LOW: float = 0.4

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "extra": "ignore"
    }


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()
