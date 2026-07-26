from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth.repository import find_user_by_name
from app.db.session import get_db
from app.schemas.user import PublicUserResponse

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/{username}", response_model=PublicUserResponse)
def read_public_user(
    username: str,
    db: Session = Depends(get_db),
) -> PublicUserResponse:
    user = find_user_by_name(db, username)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found.",
        )
    return PublicUserResponse.model_validate(user)
