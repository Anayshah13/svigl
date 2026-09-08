"""ORM models package.

Import model modules here so Alembic autogenerate discovers them via
``app.db.database.Base.metadata``.
"""

from app.models.ai_guesser import AiGuesserRun, AiGuesserScore
from app.models.canvas import CanvasState
from app.models.drawing import Drawing, DrawingReaction
from app.models.lab_score import LabScore
from app.models.room import (
    GameSession,
    GameSessionPlayer,
    GameSettings,
    Room,
    RoomPlayer,
)
from app.models.user import User

__all__ = [
    "AiGuesserRun",
    "AiGuesserScore",
    "CanvasState",
    "Drawing",
    "DrawingReaction",
    "GameSession",
    "GameSessionPlayer",
    "GameSettings",
    "LabScore",
    "Room",
    "RoomPlayer",
    "User",
]
