import logging



from fastapi import APIRouter, Depends, status

from sqlalchemy.orm import Session

from starlette.requests import Request

from starlette.responses import RedirectResponse



from app.auth import AuthError, UserPersistenceError, complete_google_login, redirect_to_google_consent

from app.auth.redirects import build_frontend_auth_error_url, build_frontend_auth_success_url

from app.db.session import get_db

from app.schemas.user import UserResponse



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

    try:

        user = await complete_google_login(request, db)

    except AuthError as exc:

        logger.info("Google OAuth rejected: %s", exc)

        return RedirectResponse(

            build_frontend_auth_error_url(str(exc)),

            status_code=status.HTTP_302_FOUND,

        )

    except UserPersistenceError as exc:

        logger.error("Google OAuth user persistence failed: %s", exc)

        return RedirectResponse(

            build_frontend_auth_error_url(str(exc)),

            status_code=status.HTTP_302_FOUND,

        )



    user_response = UserResponse.model_validate(user)

    return RedirectResponse(

        build_frontend_auth_success_url(user_response),

        status_code=status.HTTP_302_FOUND,

    )

