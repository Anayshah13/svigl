import logging

from authlib.integrations.base_client.errors import OAuthError
from sqlalchemy.orm import Session
from starlette.requests import Request
from starlette.responses import RedirectResponse

from app.auth.exceptions import AuthError
from app.auth.google import oauth
from app.auth.logging_utils import log_auth_event
from app.auth.names import format_person_name
from app.auth.post_auth_redirect import sanitize_post_auth_redirect
from app.auth.repository import upsert_user_from_google
from app.auth.schemas import GoogleProfile
from app.config import settings

logger = logging.getLogger(__name__)


async def redirect_to_google_consent(request: Request) -> RedirectResponse:
    next_path = sanitize_post_auth_redirect(request.query_params.get("next"))
    if next_path:
        request.session["post_auth_redirect"] = next_path

    log_auth_event(
        "google_login_start",
        path=str(request.url.path),
        authenticated=False,
        redirect_uri=settings.google_redirect_uri,
        post_auth_redirect=next_path,
    )
    return await oauth.google.authorize_redirect(
        request,
        settings.google_redirect_uri,
    )


def pop_post_auth_redirect(request: Request) -> str | None:
    next_path = request.session.pop("post_auth_redirect", None)
    return sanitize_post_auth_redirect(next_path)


async def complete_google_login(request: Request, db: Session):
    _validate_callback_request(request)
    profile = await _exchange_and_verify_google_profile(request)
    user = upsert_user_from_google(db, profile)
    log_auth_event(
        "google_profile_fetched",
        path=str(request.url.path),
        authenticated=True,
        user_id=str(user.id),
        email=user.email,
        provider_id=profile.provider_id,
    )
    return user


def _validate_callback_request(request: Request) -> None:
    oauth_error = request.query_params.get("error")
    if oauth_error:
        description = request.query_params.get("error_description") or oauth_error
        log_auth_event(
            "google_callback_oauth_error",
            path=str(request.url.path),
            authenticated=False,
            error=oauth_error,
            error_description=description,
        )
        raise AuthError(description)

    if not request.query_params.get("code"):
        log_auth_event(
            "google_callback_missing_code",
            path=str(request.url.path),
            authenticated=False,
        )
        raise AuthError("Missing authorization code.")


async def _exchange_and_verify_google_profile(request: Request) -> GoogleProfile:
    log_auth_event(
        "google_token_exchange_start",
        path=str(request.url.path),
        authenticated=False,
        has_code=bool(request.query_params.get("code")),
    )
    try:
        token = await oauth.google.authorize_access_token(request)
    except OAuthError as exc:
        is_rate_limited = exc.error == "rate_limit_exceeded" or (
            exc.description and ("429" in exc.description or "rate limit" in exc.description.lower())
        )
        log_auth_event(
            "google_token_exchange_failed",
            path=str(request.url.path),
            authenticated=False,
            error=exc.error,
            error_description=exc.description,
            rate_limited=is_rate_limited,
        )
        if is_rate_limited:
            raise AuthError(
                "Google sign-in is temporarily rate-limited. Please wait a few minutes before trying again."
            ) from exc
        raise AuthError("Google OAuth token exchange failed.") from exc

    log_auth_event(
        "google_token_exchange_success",
        path=str(request.url.path),
        authenticated=False,
    )

    userinfo = token.get("userinfo")
    if userinfo is None:
        userinfo = await _verify_id_token(request, token)

    return _profile_from_userinfo(userinfo)


async def _verify_id_token(request: Request, token: dict) -> dict:
    id_token = token.get("id_token")
    if not id_token:
        log_auth_event(
            "google_id_token_missing",
            path=str(request.url.path),
            authenticated=False,
        )
        raise AuthError("Google did not return an ID token.")

    try:
        userinfo = await oauth.google.parse_id_token(request, token)
    except Exception as exc:
        log_auth_event(
            "google_id_token_verify_failed",
            path=str(request.url.path),
            authenticated=False,
            error=str(exc),
        )
        raise AuthError("Google ID token verification failed.") from exc

    if userinfo is None:
        raise AuthError("Google ID token did not contain user profile information.")

    log_auth_event(
        "google_id_token_verified",
        path=str(request.url.path),
        authenticated=False,
        provider_id=userinfo.get("sub"),
    )
    return userinfo


def _profile_from_userinfo(userinfo: dict) -> GoogleProfile:
    provider_id = userinfo.get("sub")
    email = userinfo.get("email")
    name = userinfo.get("name")

    if not provider_id or not email or not name:
        log_auth_event(
            "google_profile_incomplete",
            path="/auth/google/callback",
            authenticated=False,
            has_sub=bool(provider_id),
            has_email=bool(email),
            has_name=bool(name),
        )
        raise AuthError("Google profile is missing required fields (sub, email, name).")

    if userinfo.get("email_verified") is False:
        raise AuthError("Google account email is not verified.")

    return GoogleProfile(
        provider_id=provider_id,
        email=email,
        name=format_person_name(name),
        avatar_url=userinfo.get("picture"),
    )
