from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "API"
    debug: bool = False

    postgres_user: str
    postgres_password: str
    postgres_db: str
    postgres_host: str = "postgres"
    postgres_port: int = 5432

    google_client_id: str
    google_client_secret: str
    google_redirect_uri: str
    frontend_url: str
    session_secret_key: str

    jwt_secret_key: str
    jwt_expiration_seconds: int = 60 * 60 * 24 * 7  # 7 days

    @property
    def database_url(self) -> str:
        return (
            f"postgresql://{self.postgres_user}:{self.postgres_password}"
            f"@{self.postgres_host}:{self.postgres_port}/{self.postgres_db}"
        )

    @property
    def cookie_secure(self) -> bool:
        return not self.debug

    @property
    def cors_origins(self) -> list[str]:
        base = self.frontend_url.rstrip("/")
        origins = {base}

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

    model_config = SettingsConfigDict(
        env_file=("../.env", ".env.local"),
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()
