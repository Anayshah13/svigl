"""Labs leaderboard REST API — global personal bests across all users."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user, get_current_user_optional
from app.db.session import get_db
from app.models.user import User
from app.schemas.labs import (
    LabLeaderboardEntry,
    LabLeaderboardResponse,
    LabLeaderboardSummariesResponse,
    LabLeaderboardSummaryItem,
    LabScoreSubmitRequest,
    LabScoreSubmitResponse,
)
from app.services.labs import (
    LabError,
    get_user_best,
    list_lab_leaderboard,
    list_lab_summaries,
    submit_lab_score,
)

router = APIRouter(prefix="/labs", tags=["labs"])


def _entry(rank: int, row) -> LabLeaderboardEntry:
    user = row.user
    return LabLeaderboardEntry(
        rank=rank,
        user_id=row.user_id,
        player=user.name if user else "Unknown",
        score=float(row.score),
        updated_at=row.updated_at,
    )


@router.get("/leaderboards", response_model=LabLeaderboardSummariesResponse)
def labs_leaderboard_summaries(
    db: Session = Depends(get_db),
) -> LabLeaderboardSummariesResponse:
    items = [
        LabLeaderboardSummaryItem(
            lab_slug=item["lab_slug"],
            top_score=item["top_score"],
            entry_count=item["entry_count"],
            top_player=item["top_player"],
        )
        for item in list_lab_summaries(db)
    ]
    return LabLeaderboardSummariesResponse(items=items)


@router.get("/{lab_slug}/leaderboard", response_model=LabLeaderboardResponse)
def lab_leaderboard(
    lab_slug: str,
    limit: int = Query(default=100, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
    viewer: User | None = Depends(get_current_user_optional),
) -> LabLeaderboardResponse:
    try:
        ranked, total = list_lab_leaderboard(
            db, lab_slug=lab_slug, limit=limit, offset=offset
        )
        my_best = None
        my_rank = None
        if viewer is not None:
            my_best, my_rank = get_user_best(
                db, lab_slug=lab_slug, user_id=viewer.id
            )
    except LabError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.message) from exc

    return LabLeaderboardResponse(
        lab_slug=lab_slug,
        entries=[_entry(item.rank, item.score) for item in ranked],
        total=total,
        my_best=my_best,
        my_rank=my_rank,
    )


@router.post("/{lab_slug}/scores", response_model=LabScoreSubmitResponse)
def post_lab_score(
    lab_slug: str,
    body: LabScoreSubmitRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> LabScoreSubmitResponse:
    try:
        row, is_best = submit_lab_score(
            db, lab_slug=lab_slug, user_id=user.id, score=body.score
        )
        _, rank = get_user_best(db, lab_slug=lab_slug, user_id=user.id)
    except LabError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.message) from exc

    return LabScoreSubmitResponse(
        lab_slug=row.lab_slug,
        score=float(row.score),
        is_personal_best=is_best,
        updated_at=row.updated_at,
        rank=rank,
    )
