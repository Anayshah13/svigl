import logging
from uuid import UUID

from sqlalchemy import func, select
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


def normalize_profile_slug(value: str) -> str:
    """Turn a display name or URL segment into a comparable slug (spaces → hyphens)."""
    slug = value.strip().replace(" ", "-")
    while "--" in slug:
        slug = slug.replace("--", "-")
    return slug.strip("-")


def find_user_by_name(db: Session, name: str) -> User | None:
    slug = normalize_profile_slug(name).lower()
    if not slug:
        return None
    # "Anay Shah" and URL segment "Anay-Shah" / "anay-shah" all match.
    name_as_slug = func.lower(func.replace(User.name, " ", "-"))
    return db.scalar(select(User).where(name_as_slug == slug).limit(1))


def is_name_taken(
    db: Session,
    name: str,
    *,
    exclude_user_id: UUID | None = None,
) -> bool:
    """True if another user already uses this name or the same profile slug."""
    trimmed = name.strip()
    if not trimmed:
        return False

    slug = normalize_profile_slug(trimmed).lower()
    name_as_slug = func.lower(func.replace(User.name, " ", "-"))
    query = select(User.id).where(
        (func.lower(User.name) == trimmed.lower()) | (name_as_slug == slug)
    )
    if exclude_user_id is not None:
        query = query.where(User.id != exclude_user_id)
    return db.scalar(query.limit(1)) is not None


def allocate_unique_name(db: Session, desired_name: str) -> str:
    """Return a unique display name, appending a numeric suffix on collision."""
    base = format_person_name(desired_name)
    if not base:
        base = "Player"
    if len(base) > 50:
        base = base[:50]
    if not is_name_taken(db, base):
        return base

    for suffix in range(2, 10_000):
        suffix_str = str(suffix)
        truncated = base[: max(1, 50 - len(suffix_str))]
        candidate = f"{truncated}{suffix_str}"
        if not is_name_taken(db, candidate):
            return candidate

    raise UserPersistenceError("Could not allocate a unique username.")


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
            name=allocate_unique_name(db, profile.name),
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
            if is_name_taken(db, formatted, exclude_user_id=user.id):
                raise ValueError("That username is already taken.")
            user.name = formatted

        if avatar_url is not ...:
            user.avatar_url = avatar_url

        db.commit()
        db.refresh(user)
        return user
    except ValueError:
        db.rollback()
        raise
    except IntegrityError as exc:
        db.rollback()
        raise ValueError("That username is already taken.") from exc
    except SQLAlchemyError as exc:
        db.rollback()
        logger.exception("Failed to update user profile user_id=%s", user.id)
        raise UserPersistenceError("Could not update profile.") from exc
