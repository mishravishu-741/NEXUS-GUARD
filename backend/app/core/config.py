from pydantic_settings import BaseSettings
from typing import List, Optional
import secrets


class Settings(BaseSettings):
    # Application
    APP_NAME: str = "NEXUS GUARD"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True
    ENVIRONMENT: str = "development"

    # Server
    HOST: str = "0.0.0.0"
    PORT: int = 8000

    # Database
    DATABASE_URL: str = "sqlite+aiosqlite:///./nexus_guard.db"

    # Security
    SECRET_KEY: str = secrets.token_urlsafe(32)
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # MFA
    MFA_ISSUER: str = "NEXUS GUARD"

    # CORS
    CORS_ORIGINS: List[str] = ["http://localhost:5173", "http://localhost:3000"]

    # Rate Limiting
    RATE_LIMIT_REQUESTS: int = 100
    RATE_LIMIT_WINDOW: int = 60

    # Admin Default Credentials
    ADMIN_EMAIL: str = "admin@nexusguard.com"
    ADMIN_PASSWORD: str = "change-this-in-env"
    ADMIN_USERNAME: str = "admin"

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
