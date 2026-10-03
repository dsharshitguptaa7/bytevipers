import urllib.parse
from typing import Optional, List
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import AnyHttpUrl, field_validator, model_validator

class Settings(BaseSettings):
    model_config = SettingsConfigDict(case_sensitive=True, env_file=".env", extra="ignore")

    PROJECT_NAME: str = "ByteVipers Coding Arena"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    TAGLINE: str = "Think. Code. Conquer."
    ENVIRONMENT: str = "development"  # 'development', 'testing', or 'production'

    # Security
    SECRET_KEY: str = "bytevipers-super-secret-key-change-in-production-2026-safe-hex"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 1 day
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # Database: Supports PostgreSQL (via asyncpg, e.g. Neon) or SQLite for local/testing
    DATABASE_URL: str = "sqlite+aiosqlite:///./bytevipers.db"
    
    # Judge0 Configuration
    JUDGE0_API_URL: str = "http://localhost:2358"
    JUDGE0_API_KEY: Optional[str] = None
    JUDGE0_API_HOST: Optional[str] = None
    JUDGE0_USE_RAPIDAPI: bool = False
    JUDGE0_SUBMISSION_TIMEOUT_SECONDS: int = 10
    JUDGE0_MEMORY_LIMIT_KB: int = 128000  # 128 MB
    JUDGE0_CPU_TIME_LIMIT_SECONDS: float = 2.0
    JUDGE0_FALLBACK_ISOLATED: bool = True  # Fallback to local runner ONLY in non-production
    ALLOW_SUBPROCESS_FALLBACK_IN_PRODUCTION: bool = False  # Strictly False unless validated sandbox

    # CORS
    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
    ]

    # Rate Limiting
    MAX_LOGIN_ATTEMPTS_PER_MINUTE: int = 10
    MAX_SUBMISSIONS_PER_MINUTE: int = 15

    @property
    def async_database_url(self) -> str:
        """
        Normalizes database URLs to async drivers (e.g. postgresql+asyncpg://)
        and strips incompatible libpq parameters when using asyncpg.
        """
        url = self.DATABASE_URL
        if url.startswith("postgresql://"):
            url = url.replace("postgresql://", "postgresql+asyncpg://", 1)
        elif url.startswith("postgres://"):
            url = url.replace("postgres://", "postgresql+asyncpg://", 1)

        if "postgresql+asyncpg://" in url:
            parsed = urllib.parse.urlsplit(url)
            query_params = urllib.parse.parse_qs(parsed.query)
            query_params.pop("sslmode", None)
            query_params.pop("channel_binding", None)
            new_query = urllib.parse.urlencode(query_params, doseq=True)
            url = urllib.parse.urlunsplit((parsed.scheme, parsed.netloc, parsed.path, new_query, parsed.fragment))

        return url

    @property
    def database_connect_args(self) -> dict:
        """
        Returns connection arguments for the database engine.
        Configures SSL for PostgreSQL/Neon and thread checks for SQLite.
        """
        url = self.DATABASE_URL
        if url.startswith("sqlite"):
            return {"check_same_thread": False}
        if "postgresql" in url or "postgres" in url:
            if "neon.tech" in url or "sslmode=require" in url or self.ENVIRONMENT == "production":
                return {"ssl": "require"}
        return {}

    @model_validator(mode="after")
    def validate_production_configuration(self) -> "Settings":
        """
        Enforces strict production safeguards:
        - Rejects SQLite in production.
        - Rejects default SECRET_KEY in production.
        - Enforces disabled subprocess fallback in production unless explicitly permitted.
        """
        if self.ENVIRONMENT == "production":
            if self.DATABASE_URL.startswith("sqlite"):
                raise ValueError(
                    "Production configuration violation: SQLite is not permitted in production. "
                    "A production PostgreSQL database (such as Neon) must be configured via DATABASE_URL."
                )
            if self.SECRET_KEY == "bytevipers-super-secret-key-change-in-production-2026-safe-hex":
                raise ValueError(
                    "Production configuration violation: The default development SECRET_KEY cannot be used in production. "
                    "Configure a strong, cryptographically secure SECRET_KEY in the environment."
                )
            if self.JUDGE0_FALLBACK_ISOLATED and not self.ALLOW_SUBPROCESS_FALLBACK_IN_PRODUCTION:
                # Force fallback to false in production
                object.__setattr__(self, "JUDGE0_FALLBACK_ISOLATED", False)

        return self

settings = Settings()

