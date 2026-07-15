"""Per-session collaborative whiteboard canvas state."""

from __future__ import annotations

from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import (
    DateTime,
    ForeignKey,
    Integer,
    UniqueConstraint,
    Uuid,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.types import JSON

from app.db.database import Base


class CanvasState(Base):
    """
    Authoritative shape list for the current game session / turn.

    Cleared on every ROUND_STARTED (new drawer). Mid-round joiners receive a
    CANVAS_SNAPSHOT rebuilt from ``shapes``.
    """

    __tablename__ = "canvas_states"
    __table_args__ = (
        UniqueConstraint("session_id", name="uq_canvas_states_session_id"),
    )

    id: Mapped[UUID] = mapped_column(Uuid, primary_key=True, default=uuid4)
    session_id: Mapped[UUID] = mapped_column(
        Uuid,
        ForeignKey("game_sessions.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    room_id: Mapped[UUID] = mapped_column(
        Uuid,
        ForeignKey("rooms.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    # Matches GameSession.current_turn so reconnects know the canvas epoch.
    current_turn: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    shapes: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    undo_stack: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    redo_stack: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    op_seq: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    session = relationship("GameSession", lazy="selectin")
    room = relationship("Room", lazy="selectin")
