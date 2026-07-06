import logging

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.orm import Session

from app.auth.constants import PROVIDER_GOOGLE, PROVIDER_GUEST
from app.auth.exceptions import UserPersistenceError
from app.auth.guest_username import generate_guest_username
from app.auth.names import format_person_name
from app.auth.schemas import GoogleProfile
from app.models.user import User

logger = logging.getLogger(__name__)


def find_user_by_provider(db: Session, *, provider: str, provider_id: str) -> User | None:
    return db.scalar(
        select(User).where(User.provider == provider, User.provider_id == provider_id)
    )


def upsert_user_from_google(db: Session, profile: GoogleProfile) -> User:
    try:
        user = find_user_by_provider(db, provider=PROVIDER_GOOGLE, provider_id=profile.provider_id)
        if user is not None:
            _sync_google_profile(user, profile)
            db.commit()
            db.refresh(user)
            logger.info("Updated existing Google user provider_id=%s", profile.provider_id)
            return user

        user = db.scalar(select(User).where(User.email == profile.email))
        if user is not None:
            user.provider = PROVIDER_GOOGLE
            user.provider_id = profile.provider_id
            _sync_google_profile(user, profile)
            db.commit()
            db.refresh(user)
            logger.info(
                "Linked Google account to existing email user user_id=%s",
                user.id,
            )
            return user

        user = User(
            provider=PROVIDER_GOOGLE,
            provider_id=profile.provider_id,
            email=profile.email,
            name=format_person_name(profile.name),
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


def authenticate_guest(db: Session, guest_device_id: str) -> User:
    try:
        user = find_user_by_provider(
            db,
            provider=PROVIDER_GUEST,
            provider_id=guest_device_id,
        )
        if user is not None:
            logger.info("Returning existing guest user user_id=%s", user.id)
            return user

        for _ in range(3):
            username = generate_guest_username(db)
            user = User(
                provider=PROVIDER_GUEST,
                provider_id=guest_device_id,
                email=None,
                name=username,
                avatar_url=None,
            )
            db.add(user)
            try:
                db.commit()
                db.refresh(user)
                logger.info("Created new guest user user_id=%s name=%s", user.id, user.name)
                return user
            except IntegrityError:
                db.rollback()
                existing = find_user_by_provider(
                    db,
                    provider=PROVIDER_GUEST,
                    provider_id=guest_device_id,
                )
                if existing is not None:
                    return existing
                continue

        raise UserPersistenceError("Could not create guest user.")
    except UserPersistenceError:
        raise
    except SQLAlchemyError as exc:
        db.rollback()
        logger.exception("Failed to persist guest user device_id=%s", guest_device_id)
        raise UserPersistenceError("Could not save guest user.") from exc


def _sync_google_profile(user: User, profile: GoogleProfile) -> None:
    if profile.email:
        user.email = profile.email


def update_user_profile(
    db: Session,
    user: User,
    *,
    name: str | None = None,
    avatar_url: str | None = ...,  # type: ignore[assignment]
) -> User:
    try:
        if name is not None:
            formatted = format_person_name(name)
            if len(formatted) < 2 or len(formatted) > 50:
                raise ValueError("Name must be between 2 and 50 characters.")
            user.name = formatted

        if avatar_url is not ...:
            user.avatar_url = avatar_url

        db.commit()
        db.refresh(user)
        return user
    except SQLAlchemyError as exc:
        db.rollback()
        logger.exception("Failed to update user profile user_id=%s", user.id)
        raise UserPersistenceError("Could not update profile.") from exc
