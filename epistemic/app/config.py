"""
Configuration management for Epistemic app
"""

from pydantic_settings import BaseSettings
from functools import lru_cache
import os


class Settings(BaseSettings):
    """Application settings loaded from environment variables"""

    # App Info
    app_name: str = "Epistemic"
    app_version: str = "0.1.0"
    base_path: str = os.getenv("BASE_PATH", "/epistemic")

    # Gateway
    gateway_url: str = os.getenv("GATEWAY_URL", "http://gateway:3000")

    # Google OAuth
    google_client_id: str = os.getenv("GOOGLE_CLIENT_ID", "")
    google_client_secret: str = os.getenv("GOOGLE_CLIENT_SECRET", "")
    google_redirect_uri: str = os.getenv(
        "GOOGLE_REDIRECT_URI",
        "http://localhost:7272/epistemic/api/auth/callback"
    )

    # JWT
    jwt_secret_key: str = os.getenv("JWT_SECRET_KEY", "dev-secret-key-change-in-production")
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 1440  # 24 hours

    # Database
    database_url: str = os.getenv("DATABASE_URL", "sqlite:///./epistemic.db")

    # CORS
    cors_origins: list[str] = [
        "http://localhost:7272",
        "http://localhost:3000",
        "http://localhost:8000",
    ]

    class Config:
        env_file = ".env"
        case_sensitive = False


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance"""
    return Settings()
