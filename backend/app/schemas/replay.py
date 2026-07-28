"""Replay timeline schemas — ordered drawing ops, not canvas snapshots.

Events mirror committed canvas mutations (never ephemeral previews).
Payloads reuse WhiteboardShape / HistoryOp shapes from ``schemas.canvas``.
"""

from __future__ import annotations

from typing import Any, Literal
from uuid import UUID

from pydantic import BaseModel, Field, field_validator


ReplayEventType = Literal[
    "shape.created",
    "shape.updated",
    "shape.deleted",
    "canvas.cleared",
    "undo",
    "redo",
]

ReplayTool = Literal[
    "pencil",
    "bezier",
    "rectangle",
    "ellipse",
    "arrow",
    "fill",
    "eraser",
]


class ReplayEvent(BaseModel):
    """One deterministic drawing operation on the timeline."""

    t: int = Field(ge=0, description="Milliseconds since round start")
    type: ReplayEventType
    player_id: str = Field(min_length=1, max_length=64)
    tool: ReplayTool | None = None
    payload: dict[str, Any] = Field(default_factory=dict)

    @field_validator("player_id", mode="before")
    @classmethod
    def coerce_player_id(cls, value: Any) -> str:
        return str(value)


class DrawingReplayMeta(BaseModel):
    drawing_id: UUID
    session_id: UUID
    turn_number: int
    word: str
    author_id: UUID
    author_name: str | None = None
    duration_ms: int = Field(ge=0)
    event_count: int = Field(ge=0)
    published_at: str | None = None


class DrawingReplay(BaseModel):
    """Single-round replay: metadata + ordered events."""

    version: Literal[1] = 1
    meta: DrawingReplayMeta
    events: list[ReplayEvent]


class GameReplayResponse(BaseModel):
    """All published round replays for a finished (or in-progress) game session.

    Extensible: extra fields can be added without breaking clients that ignore them.
    """

    version: Literal[1] = 1
    game_id: UUID = Field(description="Game session id")
    room_id: UUID | None = None
    drawings: list[DrawingReplay]


class DrawingReplayResponse(DrawingReplay):
    """Alias response model for GET /drawings/{id}/replay."""

    pass
