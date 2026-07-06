import logging
from uuid import UUID

from fastapi import Depends, HTTPException, status
from sqlalchemy.orm import Session
from starlette.requests import Request

from app.auth.cookies import get_token_from_request
from app.auth.jwt import JWTVerificationError, verify_access_token
from app.auth.logging_utils import log_auth_event
from app.db.session import get_db
from app.models.user import User

logger = logging.getLogger(__name__)


def get_current_user(
    request: Request,
    db: Session = Depends(get_db),
) -> User:
    path = str(request.url.path)
    token = get_token_from_request(request)
    if token is None:
        log_auth_event("me_unauthenticated", path=path, authenticated=False, reason="missing_cookie")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated.",
        )

    try:
        payload = verify_access_token(token, path=path)
    except JWTVerificationError as exc:
        log_auth_event("me_unauthenticated", path=path, authenticated=False, reason=str(exc))
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated.",
        ) from exc

    try:
        user_id = UUID(str(payload["user_id"]))
    except (KeyError, TypeError, ValueError) as exc:
        log_auth_event("me_unauthenticated", path=path, authenticated=False, reason="invalid_user_id")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated.",
        ) from exc

    user = db.get(User, user_id)
    if user is None:
        log_auth_event(
            "me_unauthenticated",
            path=path,
            authenticated=False,
            reason="user_not_found",
            user_id=str(user_id),
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated.",
        )

    log_auth_event(
        "me_success",
        path=path,
        authenticated=True,
        user_id=str(user.id),
        email=user.email,
    )
    return user
