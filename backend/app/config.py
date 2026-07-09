from typing import Literal, Self

from pydantic import AliasChoices, Field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "API"
    debug: bool = False

    # Prefer DATABASE_URL (Railway). Fall back to POSTGRES_* (local docker-compose).
    database_url_env: str | None = Field(
        default=None,
        validation_alias=AliasChoices("DATABASE_URL", "database_url"),
    )
    postgres_user: str | None = None
    postgres_password: str | None = None
    postgres_db: str | None = None
    postgres_host: str = "postgres"
    postgres_port: int = 5432

    google_client_id: str
    google_client_secret: str
    google_redirect_uri: str
    frontend_url: str
    session_secret_key: str

    # Prefer JWT_SECRET; accept legacy JWT_SECRET_KEY.
    jwt_secret: str = Field(
        validation_alias=AliasChoices("JWT_SECRET", "JWT_SECRET_KEY", "jwt_secret"),
    )
    jwt_expire_minutes: int | None = Field(
        default=None,
        validation_alias=AliasChoices("JWT_EXPIRE_MINUTES", "jwt_expire_minutes"),
    )
    jwt_expiration_seconds_legacy: int | None = Field(
        default=None,
        validation_alias=AliasChoices("JWT_EXPIRATION_SECONDS", "jwt_expiration_seconds"),
    )

    # Explicit cookie flags — set per environment (do not derive from DEBUG).
    # Dev: COOKIE_SECURE=false, COOKIE_SAMESITE=lax
    # Prod (cross-site Vercel↔Railway): COOKIE_SECURE=true, COOKIE_SAMESITE=none
    cookie_secure: bool = False
    cookie_samesite: Literal["lax", "strict", "none"] = "lax"

    # Optional comma-separated extra CORS origins (in addition to FRONTEND_URL).
    cors_origins_extra: str | None = Field(
        default=None,
        validation_alias=AliasChoices("CORS_ORIGINS", "cors_origins"),
    )

    model_config = SettingsConfigDict(
        env_file=("../.env", ".env.local"),
        env_file_encoding="utf-8",
        extra="ignore",
        populate_by_name=True,
    )

    @model_validator(mode="after")
    def validate_runtime_config(self) -> Self:
        if not self.database_url_env and not (
            self.postgres_user and self.postgres_password and self.postgres_db
        ):
            raise ValueError(
                "Database config required: set DATABASE_URL, or "
                "POSTGRES_USER + POSTGRES_PASSWORD + POSTGRES_DB."
            )
        if self.cookie_samesite == "none" and not self.cookie_secure:
            raise ValueError("COOKIE_SAMESITE=none requires COOKIE_SECURE=true")
        return self

    @property
    def jwt_secret_key(self) -> str:
        """Backward-compatible alias used by JWT helpers."""
        return self.jwt_secret

    @property
    def jwt_expiration_seconds(self) -> int:
        if self.jwt_expire_minutes is not None:
            return self.jwt_expire_minutes * 60
        if self.jwt_expiration_seconds_legacy is not None:
            return self.jwt_expiration_seconds_legacy
        return 60 * 60 * 24 * 7  # 7 days

    @property
    def database_url(self) -> str:
        if self.database_url_env:
            url = self.database_url_env
            # Railway / Heroku sometimes use postgres:// — normalize for SQLAlchemy.
            if url.startswith("postgres://"):
                return "postgresql://" + url.removeprefix("postgres://")
            return url
        return (
            f"postgresql://{self.postgres_user}:{self.postgres_password}"
            f"@{self.postgres_host}:{self.postgres_port}/{self.postgres_db}"
        )

    @property
    def cors_origins(self) -> list[str]:
        base = self.frontend_url.rstrip("/")
        origins = {base}

        if self.cors_origins_extra:
            for origin in self.cors_origins_extra.split(","):
                cleaned = origin.strip().rstrip("/")
                if cleaned:
                    origins.add(cleaned)

        # Local convenience: allow both localhost and 127.0.0.1 when FRONTEND_URL is local.
        if "://localhost" in base:
            origins.add(base.replace("://localhost", "://127.0.0.1"))
        if "://127.0.0.1" in base:
            origins.add(base.replace("://127.0.0.1", "://localhost"))

        return sorted(origins)

    @property
    def cors_origin_regex(self) -> str | None:
        if not self.debug:
            return None
        # Dev-only: allow LAN IPs so /me works when using Next.js network URL.
        return (
            r"https?://("
            r"localhost|127\.0\.0\.1|"
            r"192\.168\.\d{1,3}\.\d{1,3}|"
            r"10\.\d{1,3}\.\d{1,3}\.\d{1,3}|"
            r"172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}"
            r")(:\d+)?"
        )


settings = Settings()
