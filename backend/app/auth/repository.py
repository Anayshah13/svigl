import logging

from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.auth.exceptions import UserPersistenceError
from app.auth.schemas import GoogleProfile
from app.models.user import User

logger = logging.getLogger(__name__)


def upsert_user_from_google(db: Session, profile: GoogleProfile) -> User:
    try:
        user = db.scalar(select(User).where(User.google_id == profile.google_id))
        if user is not None:
            _sync_profile(user, profile)
            db.commit()
            db.refresh(user)
            logger.info("Updated existing Google user google_id=%s", profile.google_id)
            return user

        user = db.scalar(select(User).where(User.email == profile.email))
        if user is not None:
            user.google_id = profile.google_id
            _sync_profile(user, profile)
            db.commit()
            db.refresh(user)
            logger.info(
                "Linked Google account to existing email user user_id=%s",
                user.id,
            )
            return user

        user = User(
            google_id=profile.google_id,
            email=profile.email,
            name=profile.name,
            avatar_url=profile.avatar_url,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        logger.info("Created new Google user user_id=%s email=%s", user.id, user.email)
        return user
    except SQLAlchemyError as exc:
        db.rollback()
        logger.exception("Failed to persist Google user email=%s", profile.email)
        raise UserPersistenceError("Could not save authenticated user.") from exc


def _sync_profile(user: User, profile: GoogleProfile) -> None:
    user.name = profile.name
    user.avatar_url = profile.avatar_url
