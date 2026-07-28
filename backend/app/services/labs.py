"""Labs leaderboard persistence — personal bests across all users."""

from __future__ import annotations

from dataclasses import dataclass
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.lab_score import LAB_SLUGS, LabScore


class LabError(Exception):
    def __init__(self, code: str, message: str, *, status_code: int = 400):
        self.code = code
        self.message = message
        self.status_code = status_code
        super().__init__(message)


@dataclass(frozen=True)
class RankedLabScore:
    rank: int
    score: LabScore


def _require_slug(lab_slug: str) -> str:
    slug = lab_slug.strip().lower()
    if slug not in LAB_SLUGS:
        raise LabError("invalid_lab", f"Unknown lab: {lab_slug}", status_code=404)
    return slug


def submit_lab_score(
    db: Session,
    *,
    lab_slug: str,
    user_id: UUID,
    score: float,
) -> tuple[LabScore, bool]:
    """Upsert personal best. Returns (row, is_personal_best)."""
    slug = _require_slug(lab_slug)
    if not (0 < score <= 100) or score != score:  # NaN check
        raise LabError("invalid_score", "Score must be in (0, 100].")

    # Round to 2 decimals to match frontend finalizeScore.
    score = round(float(score), 2)

    existing = db.scalars(
        select(LabScore).where(LabScore.lab_slug == slug, LabScore.user_id == user_id)
    ).first()

    if existing is None:
        row = LabScore(lab_slug=slug, user_id=user_id, score=score)
        db.add(row)
        db.commit()
        db.refresh(row)
        return row, True

    if score <= existing.score:
        return existing, False

    existing.score = score
    db.commit()
    db.refresh(existing)
    return existing, True


def list_lab_leaderboard(
    db: Session,
    *,
    lab_slug: str,
    limit: int = 100,
    offset: int = 0,
) -> tuple[list[RankedLabScore], int]:
    slug = _require_slug(lab_slug)
    total = db.scalar(
        select(func.count()).select_from(LabScore).where(LabScore.lab_slug == slug)
    ) or 0

    rows = db.scalars(
        select(LabScore)
        .where(LabScore.lab_slug == slug)
        .order_by(LabScore.score.desc(), LabScore.updated_at.asc())
        .offset(offset)
        .limit(limit)
    ).all()

    ranked = [
        RankedLabScore(rank=offset + i + 1, score=row) for i, row in enumerate(rows)
    ]
    return ranked, int(total)


def get_user_best(
    db: Session,
    *,
    lab_slug: str,
    user_id: UUID,
) -> tuple[float | None, int | None]:
    slug = _require_slug(lab_slug)
    mine = db.scalars(
        select(LabScore).where(LabScore.lab_slug == slug, LabScore.user_id == user_id)
    ).first()
    if mine is None:
        return None, None

    better = db.scalar(
        select(func.count())
        .select_from(LabScore)
        .where(
            LabScore.lab_slug == slug,
            (LabScore.score > mine.score)
            | (
                (LabScore.score == mine.score)
                & (LabScore.updated_at < mine.updated_at)
            ),
        )
    ) or 0
    return float(mine.score), int(better) + 1


def list_lab_summaries(db: Session) -> list[dict]:
    items: list[dict] = []
    for slug in LAB_SLUGS:
        count = db.scalar(
            select(func.count()).select_from(LabScore).where(LabScore.lab_slug == slug)
        ) or 0
        top = db.scalars(
            select(LabScore)
            .where(LabScore.lab_slug == slug)
            .order_by(LabScore.score.desc(), LabScore.updated_at.asc())
            .limit(1)
        ).first()
        items.append(
            {
                "lab_slug": slug,
                "top_score": float(top.score) if top else None,
                "entry_count": int(count),
                "top_player": top.user.name if top and top.user else None,
            }
        )
    return items
