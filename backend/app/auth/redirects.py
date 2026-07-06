from app.config import settings


def build_frontend_auth_success_url() -> str:
    return f"{settings.frontend_url}/auth/callback"


def build_frontend_auth_error_url(message: str) -> str:
    from urllib.parse import urlencode

    return f"{settings.frontend_url}/sign-in?{urlencode({'error': message})}"
