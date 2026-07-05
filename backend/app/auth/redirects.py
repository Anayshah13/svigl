from urllib.parse import urlencode

from app.config import settings
from app.schemas.user import UserResponse


def build_frontend_auth_success_url(user: UserResponse) -> str:
    params = urlencode(
        {
            "id": str(user.id),
            "email": user.email,
            "name": user.name,
            "google_id": user.google_id or "",
            "avatar_url": user.avatar_url or "",
        }
    )
    return f"{settings.frontend_url}/auth/callback?{params}"


def build_frontend_auth_error_url(message: str) -> str:
    return f"{settings.frontend_url}/sign-in?{urlencode({'error': message})}"
