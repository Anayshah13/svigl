import logging
from typing import Any

from authlib.integrations.base_client.errors import OAuthError
from sqlalchemy.orm import Session
from starlette.requests import Request
from starlette.responses import RedirectResponse

from app.auth.exceptions import AuthError, UserPersistenceError
from app.auth.google import oauth
from app.auth.repository import upsert_user_from_google
from app.auth.schemas import GoogleProfile
from app.config import settings
from app.models.user import User

logger = logging.getLogger(__name__)


async def redirect_to_google_consent(request: Request) -> RedirectResponse:
    logger.debug("Starting Google OAuth redirect redirect_uri=%s", settings.google_redirect_uri)
    return await oauth.google.authorize_redirect(
        request,
        settings.google_redirect_uri,
    )


async def complete_google_login(request: Request, db: Session) -> User:
    profile = await _exchange_and_verify_google_profile(request)
    return upsert_user_from_google(db, profile)


async def _exchange_and_verify_google_profile(request: Request) -> GoogleProfile:
    try:
        token = await oauth.google.authorize_access_token(request)
    except OAuthError as exc:
        logger.warning("Google token exchange failed error=%s", exc.error)
        raise AuthError("Google OAuth token exchange failed.") from exc

    userinfo = token.get("userinfo")
    if userinfo is None:
        userinfo = await _verify_id_token(request, token)

    return _profile_from_userinfo(userinfo)


async def _verify_id_token(request: Request, token: dict[str, Any]) -> dict[str, Any]:
    id_token = token.get("id_token")
    if not id_token:
        logger.warning("Google response missing id_token and userinfo")
        raise AuthError("Google did not return an ID token.")

    try:
        userinfo = await oauth.google.parse_id_token(request, token)
    except Exception as exc:
        logger.exception("Google ID token verification failed")
        raise AuthError("Google ID token verification failed.") from exc

    if userinfo is None:
        raise AuthError("Google ID token did not contain user profile information.")

    logger.debug("Verified Google ID token sub=%s", userinfo.get("sub"))
    return userinfo


def _profile_from_userinfo(userinfo: dict[str, Any]) -> GoogleProfile:
    google_id = userinfo.get("sub")
    email = userinfo.get("email")
    name = userinfo.get("name")

    if not google_id or not email or not name:
        logger.warning(
            "Google profile missing required fields sub=%s email=%s name=%s",
            bool(google_id),
            bool(email),
            bool(name),
        )
        raise AuthError("Google profile is missing required fields (sub, email, name).")

    if userinfo.get("email_verified") is False:
        logger.warning("Google email is not verified email=%s", email)
        raise AuthError("Google account email is not verified.")

    return GoogleProfile(
        google_id=google_id,
        email=email,
        name=name,
        avatar_url=userinfo.get("picture"),
    )
