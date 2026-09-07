from typing import Literal, Self

from pydantic import AliasChoices, Field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "API"
    debug: bool = False

    # Prefer DATABASE_URL. Fall back to POSTGRES_* (e.g. local docker-compose).
    database_url_env: str | None = Field(
        default=None,
        validation_alias=AliasChoices("DATABASE_URL", "database_url"),
    )
    postgres_user: str | None = None
    postgres_password: str | None = None
    postgres_db: str | None = None
    # Used when DATABASE_URL is unset (e.g. compose service hostname).
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
    # Same-site (or localhost): COOKIE_SECURE=false/true, COOKIE_SAMESITE=lax
    # Cross-site frontend↔API: COOKIE_SECURE=true, COOKIE_SAMESITE=none
    cookie_secure: bool = False
    cookie_samesite: Literal["lax", "strict", "none"] = "lax"

    # Optional comma-separated extra CORS origins (in addition to FRONTEND_URL).
    cors_origins_extra: str | None = Field(
        default=None,
        validation_alias=AliasChoices("CORS_ORIGINS", "cors_origins"),
    )

    # --- AI Guesser (experimental /ai-guesser demo) ---
    # Unset disables the feature: the endpoint reports it as unavailable
    # instead of failing, so the demo page still lets the player draw.
    gemini_api_key: str | None = None
    # Keep this a low-cost multimodal Flash/Lite tier — it runs once every
    # few seconds per player. Never hardcode the model name in call sites.
    gemini_ai_guesser_model: str = "gemini-3.5-flash-lite"
    gemini_timeout_seconds: float = 18.0
    # Gemini 3.x uses thinkingLevel (minimal/low/medium/high). Blank omits it.
    gemini_thinking_level: str = "minimal"
    # Legacy Gemini 2.5 knob. Ignored when thinking_level is set. -1 omits it.
    gemini_thinking_budget: int = -1
    # Abuse guard + Gemini free-tier headroom (Flash-Lite is often ~15 RPM).
    # One client at MIN_CALL_INTERVAL_MS=4000 already tops out at 15/min.
    ai_guesser_rate_limit_per_minute: int = 15
    ai_guesser_daily_limit_per_ip: int = 150
    ai_guesser_daily_global_limit: int = 800
    # Only honor X-Forwarded-For / X-Real-IP when a proxy overwrites them.
    ai_guesser_trust_forwarded_for: bool = False
    ai_guesser_max_image_bytes: int = 200_000
    # TTS uses the same Gemini key. A dedicated model; never send the key west.
    gemini_tts_model: str = "gemini-3.1-flash-tts-preview"
    gemini_tts_voice: str = "Puck"
    gemini_tts_timeout_seconds: float = 12.0
    ai_guesser_tts_rate_limit_per_minute: int = 15
    ai_guesser_tts_daily_limit_per_ip: int = 150

    # --- Multiplayer system bot (regular rooms, not /ai-guesser) ---
    bot_guess_debounce_seconds: float = 4.0
    bot_guess_interval_seconds: float = 5.0
    bot_guess_timeout_seconds: float = 18.0
    bot_max_guess_calls_per_turn: int = 12
    bot_global_ai_concurrency: int = 4
    bot_guess_min_confidence: float = 0.22

    # Same EmailJS template as /feedback. Unset disables limit-alert mail.
    emailjs_service_id: str | None = Field(
        default=None,
        validation_alias=AliasChoices(
            "EMAILJS_SERVICE_ID", "NEXT_PUBLIC_EMAILJS_SERVICE_ID"
        ),
    )
    emailjs_template_id: str | None = Field(
        default=None,
        validation_alias=AliasChoices(
            "EMAILJS_TEMPLATE_ID", "NEXT_PUBLIC_EMAILJS_TEMPLATE_ID"
        ),
    )
    emailjs_public_key: str | None = Field(
        default=None,
        validation_alias=AliasChoices(
            "EMAILJS_PUBLIC_KEY", "NEXT_PUBLIC_EMAILJS_PUBLIC_KEY"
        ),
    )
    emailjs_alert_to: str = "anayshah10@gmail.com"

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
            # Some providers still emit postgres:// — normalize for SQLAlchemy.
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
