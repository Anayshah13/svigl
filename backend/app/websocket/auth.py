"""
WebSocket authentication.

Reuses the existing JWT system. Token is extracted from the cookie header
on the initial WebSocket handshake (upgrade request).
"""

from __future__ import annotations

import logging
from uuid import UUID

from fastapi import WebSocket
from sqlalchemy.orm import Session

from app.auth.cookies import AUTH_COOKIE_NAME
from app.auth.jwt import JWTVerificationError, verify_access_token
from app.models.user import User

logger = logging.getLogger(__name__)


def authenticate_websocket(ws: WebSocket, db: Session) -> User | None:
    """
    Authenticate a WebSocket connection using the JWT from cookies.
    Returns the User if valid, None otherwise.
    """
    token = ws.cookies.get(AUTH_COOKIE_NAME)
    if not token:
        logger.debug("WS auth failed: no cookie")
        return None

    try:
        payload = verify_access_token(token, path="/ws")
    except JWTVerificationError:
        logger.debug("WS auth failed: invalid token")
        return None

    try:
        user_id = UUID(str(payload["user_id"]))
    except (KeyError, TypeError, ValueError):
        return None

    user = db.get(User, user_id)
    if user is None:
        logger.debug("WS auth failed: user not found %s", user_id)
        return None

    return user
