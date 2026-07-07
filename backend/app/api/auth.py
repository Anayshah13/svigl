import logging

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from starlette.requests import Request
from starlette.responses import RedirectResponse, Response

from app.auth import AuthError, UserPersistenceError, complete_google_login, redirect_to_google_consent
from app.auth.cookies import set_auth_cookie
from app.auth.jwt import create_access_token
from app.auth.logging_utils import log_auth_event
from app.auth.oauth_flow import pop_post_auth_redirect
from app.auth.redirects import build_frontend_auth_error_url, build_frontend_auth_success_url
from app.auth.repository import authenticate_guest
from app.db.session import get_db
from app.models.user import User
from app.schemas.user import GuestAuthRequest, UserResponse

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["auth"])


@router.get("/google")
async def google_login(request: Request) -> RedirectResponse:
    return await redirect_to_google_consent(request)


@router.get("/google/callback")
async def google_callback(
    request: Request,
    db: Session = Depends(get_db),
) -> RedirectResponse:
    path = str(request.url.path)
    try:
        user = await complete_google_login(request, db)
    except AuthError as exc:
        log_auth_event(
            "google_callback_failed",
            path=path,
            authenticated=False,
            reason=str(exc),
        )
        return RedirectResponse(
            build_frontend_auth_error_url(str(exc)),
            status_code=status.HTTP_302_FOUND,
        )
    except UserPersistenceError as exc:
        log_auth_event(
            "google_callback_failed",
            path=path,
            authenticated=False,
            reason=str(exc),
        )
        return RedirectResponse(
            build_frontend_auth_error_url(str(exc)),
            status_code=status.HTTP_302_FOUND,
        )

    token = create_access_token(user_id=user.id, email=user.email, path=path)
    next_path = pop_post_auth_redirect(request)
    response = RedirectResponse(
        build_frontend_auth_success_url(next_path),
        status_code=status.HTTP_302_FOUND,
    )
    set_auth_cookie(response, token, path=path)
    log_auth_event(
        "google_callback_success",
        path=path,
        authenticated=True,
        user_id=str(user.id),
        email=user.email,
        provider=user.provider,
    )
    return response


@router.post("/guest", response_model=UserResponse)
def guest_login(
    request: Request,
    body: GuestAuthRequest,
    response: Response,
    db: Session = Depends(get_db),
) -> User:
    path = str(request.url.path)
    guest_device_id = str(body.guest_device_id)

    try:
        user = authenticate_guest(db, guest_device_id)
    except UserPersistenceError as exc:
        log_auth_event(
            "guest_login_failed",
            path=path,
            authenticated=False,
            reason=str(exc),
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(exc),
        ) from exc

    token = create_access_token(user_id=user.id, email=user.email, path=path)
    set_auth_cookie(response, token, path=path)
    log_auth_event(
        "guest_login_success",
        path=path,
        authenticated=True,
        user_id=str(user.id),
        provider=user.provider,
        is_new_guest=user.created_at == user.updated_at,
    )
    return user
