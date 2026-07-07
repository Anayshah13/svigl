from urllib.parse import urlencode

from app.config import settings
from app.auth.post_auth_redirect import sanitize_post_auth_redirect


def build_frontend_auth_success_url(next_path: str | None = None) -> str:
    safe_next = sanitize_post_auth_redirect(next_path)
    base = f"{settings.frontend_url}/auth/callback"
    if not safe_next:
        return base
    return f"{base}?{urlencode({'next': safe_next})}"


def build_frontend_auth_error_url(message: str) -> str:
    return f"{settings.frontend_url}/sign-in?{urlencode({'error': message})}"
