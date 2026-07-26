"""Published and in-progress drawings with per-user reactions.

A drawing row is created when a round becomes active so live reactions can
attach to a stable id. On round end the canvas snapshot is copied onto the
same row and it becomes a gallery item — reactions carry over with no copy.
"""

from __future__ import annotations

from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    ForeignKey,
    Integer,
    String,
    UniqueConstraint,
    Uuid,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.types import JSON

from app.db.database import Base

DRAWING_STATUS_IN_PROGRESS = "in_progress"
DRAWING_STATUS_PUBLISHED = "published"
DRAWING_STATUS_ABANDONED = "abandoned"

REACTION_LIKE = "like"
REACTION_DISLIKE = "dislike"


class Drawing(Base):
    __tablename__ = "drawings"
    __table_args__ = (
        CheckConstraint(
            "status IN ('in_progress', 'published', 'abandoned')",
            name="ck_drawings_status",
        ),
        CheckConstraint("likes_count >= 0", name="ck_drawings_likes_count"),
        CheckConstraint("dislikes_count >= 0", name="ck_drawings_dislikes_count"),
        UniqueConstraint(
            "session_id",
            "turn_number",
            name="uq_drawings_session_turn",
        ),
    )

    id: Mapped[UUID] = mapped_column(Uuid, primary_key=True, default=uuid4)
    author_id: Mapped[UUID] = mapped_column(
        Uuid,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    room_id: Mapped[UUID | None] = mapped_column(
        Uuid,
        ForeignKey("rooms.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    session_id: Mapped[UUID] = mapped_column(Uuid, nullable=False, index=True)
    turn_number: Mapped[int] = mapped_column(Integer, nullable=False)
    word: Mapped[str] = mapped_column(String(64), nullable=False)
    # WhiteboardExport JSON (version / viewBox / shapes / exportedAt).
    document: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    status: Mapped[str] = mapped_column(
        String(16),
        nullable=False,
        default=DRAWING_STATUS_IN_PROGRESS,
        server_default=DRAWING_STATUS_IN_PROGRESS,
        index=True,
    )
    likes_count: Mapped[int] = mapped_column(
        Integer, nullable=False, default=0, server_default="0"
    )
    dislikes_count: Mapped[int] = mapped_column(
        Integer, nullable=False, default=0, server_default="0"
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    published_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True, index=True
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    author = relationship("User", lazy="joined", foreign_keys=[author_id])
    reactions: Mapped[list["DrawingReaction"]] = relationship(
        back_populates="drawing",
        cascade="all, delete-orphan",
        lazy="selectin",
    )


class DrawingReaction(Base):
    """One reaction per user per drawing (like or dislike)."""

    __tablename__ = "drawing_reactions"
    __table_args__ = (
        UniqueConstraint(
            "drawing_id",
            "user_id",
            name="uq_drawing_reactions_drawing_user",
        ),
        CheckConstraint(
            "value IN ('like', 'dislike')",
            name="ck_drawing_reactions_value",
        ),
    )

    id: Mapped[UUID] = mapped_column(Uuid, primary_key=True, default=uuid4)
    drawing_id: Mapped[UUID] = mapped_column(
        Uuid,
        ForeignKey("drawings.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    user_id: Mapped[UUID] = mapped_column(
        Uuid,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    value: Mapped[str] = mapped_column(String(16), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    drawing: Mapped["Drawing"] = relationship(back_populates="reactions")
    user = relationship("User", lazy="joined")
