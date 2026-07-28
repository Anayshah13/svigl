"""HTTP API for game / drawing replay timelines."""

from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.replay import DrawingReplayResponse, GameReplayResponse
from app.services.replay import ReplayError, get_drawing_replay, get_game_replay

router = APIRouter(tags=["replay"])


def _http(exc: ReplayError) -> HTTPException:
    return HTTPException(status_code=exc.status_code, detail=exc.message)


@router.get("/games/{game_id}/replay", response_model=GameReplayResponse)
def fetch_game_replay(
    game_id: UUID,
    db: Session = Depends(get_db),
) -> GameReplayResponse:
    """Return ordered per-round replays for a game session.

    ``game_id`` is the ``GameSession.id``. Each drawing includes metadata and
    an append-only event list suitable for client-side timed playback.
    """
    try:
        return get_game_replay(db, game_id)
    except ReplayError as exc:
        raise _http(exc) from exc


@router.get("/drawings/{drawing_id}/replay", response_model=DrawingReplayResponse)
def fetch_drawing_replay(
    drawing_id: UUID,
    db: Session = Depends(get_db),
) -> DrawingReplayResponse:
    """Return a single published drawing's replay timeline."""
    try:
        return get_drawing_replay(db, drawing_id)
    except ReplayError as exc:
        raise _http(exc) from exc
