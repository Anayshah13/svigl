"""Persistent Labs personal-best scores (one row per user per lab)."""

from __future__ import annotations

from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    Float,
    ForeignKey,
    Index,
    String,
    UniqueConstraint,
    Uuid,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.database import Base

LAB_SLUGS = (
    "perfect-circle",
    "perfect-square",
    "perfect-triangle",
    "infinity-loop",
)


class LabScore(Base):
    __tablename__ = "lab_scores"
    __table_args__ = (
        UniqueConstraint("lab_slug", "user_id", name="uq_lab_scores_lab_user"),
        CheckConstraint(
            "lab_slug IN ("
            "'perfect-circle', 'perfect-square', 'perfect-triangle', 'infinity-loop'"
            ")",
            name="ck_lab_scores_lab_slug",
        ),
        CheckConstraint("score > 0 AND score <= 100", name="ck_lab_scores_score_range"),
        Index("ix_lab_scores_lab_score", "lab_slug", "score"),
    )

    id: Mapped[UUID] = mapped_column(Uuid, primary_key=True, default=uuid4)
    lab_slug: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    user_id: Mapped[UUID] = mapped_column(
        Uuid,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    # Percentage 0–100 from the Labs scoring engine (personal best).
    score: Mapped[float] = mapped_column(Float, nullable=False)
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

    user = relationship("User", lazy="joined", foreign_keys=[user_id])
