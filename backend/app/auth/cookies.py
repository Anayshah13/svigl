from starlette.requests import Request
from starlette.responses import Response

from app.auth.logging_utils import log_auth_event
from app.config import settings

AUTH_COOKIE_NAME = "svigl_access_token"


def get_token_from_request(request: Request) -> str | None:
    return request.cookies.get(AUTH_COOKIE_NAME)


def set_auth_cookie(response: Response, token: str, *, path: str) -> None:
    response.set_cookie(
        key=AUTH_COOKIE_NAME,
        value=token,
        max_age=settings.jwt_expiration_seconds,
        httponly=True,
        secure=settings.cookie_secure,
        samesite="lax",
        path="/",
    )
    log_auth_event(
        "auth_cookie_set",
        path=path,
        authenticated=True,
        cookie_name=AUTH_COOKIE_NAME,
        max_age=settings.jwt_expiration_seconds,
        secure=settings.cookie_secure,
        samesite="lax",
    )


def clear_auth_cookie(response: Response, *, path: str) -> None:
    response.set_cookie(
        key=AUTH_COOKIE_NAME,
        value="",
        max_age=0,
        httponly=True,
        secure=settings.cookie_secure,
        samesite="lax",
        path="/",
    )
    log_auth_event(
        "auth_cookie_cleared",
        path=path,
        authenticated=False,
        cookie_name=AUTH_COOKIE_NAME,
    )
