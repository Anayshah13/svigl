from datetime import UTC, datetime, timedelta
from typing import Any
from uuid import UUID

import jwt
from jwt.exceptions import InvalidTokenError

from app.auth.logging_utils import log_auth_event
from app.config import settings

JWT_ALGORITHM = "HS256"


class JWTVerificationError(Exception):
    """Raised when a JWT is missing, expired, or invalid."""


def create_access_token(
    *,
    user_id: UUID,
    email: str | None = None,
    path: str = "/auth",
) -> str:
    expires_at = datetime.now(UTC) + timedelta(seconds=settings.jwt_expiration_seconds)
    payload: dict[str, Any] = {
        "user_id": str(user_id),
        "exp": expires_at,
    }
    if email is not None:
        payload["email"] = email

    token = jwt.encode(payload, settings.jwt_secret_key, algorithm=JWT_ALGORITHM)
    log_auth_event(
        "jwt_created",
        path=path,
        authenticated=True,
        user_id=str(user_id),
        email=email,
        expires_at=expires_at.isoformat(),
    )
    return token


def verify_access_token(token: str, *, path: str = "/me") -> dict[str, Any]:
    try:
        payload = jwt.decode(
            token,
            settings.jwt_secret_key,
            algorithms=[JWT_ALGORITHM],
        )
    except InvalidTokenError as exc:
        log_auth_event(
            "jwt_verify_failed",
            path=path,
            authenticated=False,
            reason=str(exc),
        )
        raise JWTVerificationError("Invalid or expired access token.") from exc

    user_id = payload.get("user_id")
    if not user_id:
        log_auth_event(
            "jwt_verify_failed",
            path=path,
            authenticated=False,
            reason="missing_claims",
        )
        raise JWTVerificationError("Access token is missing required claims.")

    log_auth_event(
        "jwt_verified",
        path=path,
        authenticated=True,
        user_id=str(user_id),
        email=payload.get("email"),
    )
    return payload
