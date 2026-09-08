"""Weekly AI Guesser runs and personal-best scores."""

from __future__ import annotations

from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    UniqueConstraint,
    Uuid,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.types import JSON

from app.db.database import Base

JsonType = JSON().with_variant(JSONB, "postgresql")


class AiGuesserRun(Base):
    __tablename__ = "ai_guesser_runs"
    __table_args__ = (
        CheckConstraint(
            "game_index >= 1 AND game_index <= 5",
            name="ck_ai_guesser_runs_game_index",
        ),
        CheckConstraint(
            "status IN ('open', 'finished', 'abandoned')",
            name="ck_ai_guesser_runs_status",
        ),
        Index("ix_ai_guesser_runs_user_status", "user_id", "status"),
    )

    id: Mapped[UUID] = mapped_column(Uuid, primary_key=True, default=uuid4)
    user_id: Mapped[UUID] = mapped_column(
        Uuid, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    week_id: Mapped[str] = mapped_column(String(16), nullable=False, index=True)
    game_index: Mapped[int] = mapped_column(Integer, nullable=False)
    prompt_index: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    prompt_started_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    calls_used: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    splits: Mapped[list] = mapped_column(JsonType, nullable=False, default=list)
    status: Mapped[str] = mapped_column(String(16), nullable=False, default="open")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    user = relationship("User", lazy="joined", foreign_keys=[user_id])


class AiGuesserScore(Base):
    __tablename__ = "ai_guesser_scores"
    __table_args__ = (
        UniqueConstraint(
            "week_id", "game_index", "user_id", name="uq_ai_guesser_scores_week_game_user"
        ),
        CheckConstraint(
            "game_index >= 1 AND game_index <= 5",
            name="ck_ai_guesser_scores_game_index",
        ),
        CheckConstraint("total_ms > 0", name="ck_ai_guesser_scores_total_ms"),
        Index("ix_ai_guesser_scores_week_game_total", "week_id", "game_index", "total_ms"),
    )

    id: Mapped[UUID] = mapped_column(Uuid, primary_key=True, default=uuid4)
    user_id: Mapped[UUID] = mapped_column(
        Uuid, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    week_id: Mapped[str] = mapped_column(String(16), nullable=False, index=True)
    game_index: Mapped[int] = mapped_column(Integer, nullable=False)
    total_ms: Mapped[int] = mapped_column(Integer, nullable=False)
    splits: Mapped[list] = mapped_column(JsonType, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    user = relationship("User", lazy="joined", foreign_keys=[user_id])
