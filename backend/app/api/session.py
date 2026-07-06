from fastapi import APIRouter, Depends, HTTPException, status
from starlette.requests import Request
from starlette.responses import RedirectResponse, Response

from app.auth.cookies import clear_auth_cookie
from app.auth.dependencies import get_current_user
from app.auth.exceptions import UserPersistenceError
from app.auth.logging_utils import log_auth_event
from app.auth.names import format_person_name
from app.auth.repository import update_user_profile
from app.config import settings
from app.db.session import get_db
from app.models.user import User
from app.schemas.user import UpdateProfileRequest, UserResponse
from sqlalchemy.orm import Session

router = APIRouter(tags=["session"])

MAX_AVATAR_BYTES = 300_000


def _validate_avatar_url(avatar_url: str | None) -> None:
    if avatar_url is None:
        return
    if avatar_url.startswith("data:image/"):
        if len(avatar_url) > MAX_AVATAR_BYTES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Uploaded image is too large. Try a smaller file.",
            )
        return
    if not avatar_url.startswith(("http://", "https://")):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Avatar URL must be an http(s) link or uploaded image.",
        )
    if len(avatar_url) > 2048:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Avatar URL is too long.",
        )


@router.get("/me", response_model=UserResponse)
def read_current_user(current_user: User = Depends(get_current_user)) -> UserResponse:
    return UserResponse.model_validate(current_user)


@router.patch("/me", response_model=UserResponse)
def update_current_user(
    payload: UpdateProfileRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> UserResponse:
    name = None
    if payload.name is not None:
        name = format_person_name(payload.name.strip())
        if len(name) < 2:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Name must be at least 2 characters.",
            )

    avatar_url = ...
    if payload.remove_avatar:
        avatar_url = None
    elif payload.avatar_url is not None:
        _validate_avatar_url(payload.avatar_url.strip() if payload.avatar_url else None)
        avatar_url = payload.avatar_url.strip() if payload.avatar_url else None

    if name is None and avatar_url is ...:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No profile changes provided.",
        )

    try:
        user = update_user_profile(
            db,
            current_user,
            name=name,
            avatar_url=avatar_url,
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except UserPersistenceError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(exc),
        ) from exc

    log_auth_event(
        "profile_updated",
        path="/me",
        authenticated=True,
        user_id=str(user.id),
        name_changed=name is not None,
        avatar_changed=avatar_url is not ...,
    )
    return UserResponse.model_validate(user)


@router.get("/logout")
def logout_redirect(request: Request) -> RedirectResponse:
    path = str(request.url.path)
    response = RedirectResponse(
        f"{settings.frontend_url.rstrip('/')}/sign-in",
        status_code=status.HTTP_302_FOUND,
    )
    clear_auth_cookie(response, path=path)
    log_auth_event("logout_success", path=path, authenticated=False)
    return response


@router.post("/logout", status_code=204)
def logout(request: Request) -> Response:
    path = str(request.url.path)
    response = Response(status_code=204)
    clear_auth_cookie(response, path=path)
    log_auth_event("logout_success", path=path, authenticated=False)
    return response
