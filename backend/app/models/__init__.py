"""ORM models package.

Import model modules here so Alembic autogenerate discovers them via
``app.db.database.Base.metadata``.
"""

from app.models.canvas import CanvasState
from app.models.drawing import Drawing, DrawingReaction
from app.models.room import (
    GameSession,
    GameSessionPlayer,
    GameSettings,
    Room,
    RoomPlayer,
)
from app.models.user import User

__all__ = [
    "CanvasState",
    "Drawing",
    "DrawingReaction",
    "GameSession",
    "GameSessionPlayer",
    "GameSettings",
    "Room",
    "RoomPlayer",
    "User",
]
