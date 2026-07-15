from urllib.parse import urlencode

from app.config import settings
from app.auth.post_auth_redirect import sanitize_post_auth_redirect


def build_frontend_auth_success_url(
    next_path: str | None = None,
    *,
    access_token: str | None = None,
) -> str:
    safe_next = sanitize_post_auth_redirect(next_path)
    base = f"{settings.frontend_url}/auth/callback"
    params: dict[str, str] = {}
    if safe_next:
        params["next"] = safe_next
    # Safari often cannot use the cross-site auth cookie after OAuth redirect.
    # Token is consumed client-side and stripped from the URL immediately.
    # (Fragments are unreliable on HTTP Location redirects.)
    if access_token:
        params["access_token"] = access_token
    if not params:
        return base
    return f"{base}?{urlencode(params)}"


def build_frontend_auth_error_url(message: str) -> str:
    return f"{settings.frontend_url}/sign-in?{urlencode({'error': message})}"
