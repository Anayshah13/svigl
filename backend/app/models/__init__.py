"""ORM models package.

Import model modules here so Alembic autogenerate discovers them via
``app.db.database.Base.metadata``.
"""

from app.models.user import User

__all__ = ["User"]
