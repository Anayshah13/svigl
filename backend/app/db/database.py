import os

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase

from app.config import settings


class Base(DeclarativeBase):
    """SQLAlchemy declarative base for all ORM models."""


# SQL echo is extremely noisy (presence/sweeper). Opt in with SQL_ECHO=1.
_sql_echo = os.getenv("SQL_ECHO", "").lower() in ("1", "true", "yes")

engine = create_engine(
    settings.database_url,
    pool_pre_ping=True,
    echo=_sql_echo,
)
