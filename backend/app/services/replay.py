"""Record and serve drawing replay timelines.

Architecture
------------
Live multiplayer mutates ``CanvasState`` and broadcasts WS events. Replay is a
*side channel*: after each successful committed mutation we append a timed
event onto the in-progress ``Drawing.timeline`` JSON list.

Ephemeral previews are intentionally omitted — pencil strokes land as a single
``shape.created`` with the final smoothed path (same fidelity as remotes see
after pointer-up). Undo/redo store the ``HistoryOp`` so playback can invert
ops without needing canvas snapshots.

At publish time the timeline is already on the row; gallery keeps using
``document`` (static WhiteboardExport) for thumbnails.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload
from sqlalchemy.orm.attributes import flag_modified

from app.models.drawing import (
    DRAWING_STATUS_ABANDONED,
    DRAWING_STATUS_PUBLISHED,
    Drawing,
)
from app.models.room import GameSession
from app.schemas.replay import (
    DrawingReplay,
    DrawingReplayMeta,
    GameReplayResponse,
    ReplayEvent,
    ReplayEventType,
    ReplayTool,
)


class ReplayError(Exception):
    def __init__(self, code: str, message: str, *, status_code: int = 404) -> None:
        super().__init__(message)
        self.code = code
        self.message = message
        self.status_code = status_code


def _aware(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value


def elapsed_ms_since_round_start(session: GameSession) -> int:
    """Relative timestamp for replay events (independent of wall clock skew)."""
    started = session.round_started_at
    if started is None:
        return 0
    now = datetime.now(timezone.utc)
    return max(0, int((now - _aware(started)).total_seconds() * 1000))


def _tool_from_shape(shape: dict[str, Any] | None) -> ReplayTool | None:
    if not isinstance(shape, dict):
        return None
    tool = shape.get("tool")
    if tool in (
        "pencil",
        "bezier",
        "rectangle",
        "ellipse",
        "arrow",
        "fill",
    ):
        return tool  # type: ignore[return-value]
    return None


def append_replay_event(
    db: Session,
    *,
    session: GameSession,
    event_type: ReplayEventType,
    player_id: UUID | str,
    payload: dict[str, Any],
    tool: ReplayTool | None = None,
) -> None:
    """Append one committed op to the current drawing's timeline (best-effort).

    No-ops when there is no in-progress drawing — keeps canvas mutations
    isolated from replay failures.
    """
    drawing_id = session.current_drawing_id
    if drawing_id is None:
        return

    drawing = db.get(Drawing, drawing_id)
    if drawing is None or drawing.status == DRAWING_STATUS_ABANDONED:
        return

    if tool is None and event_type in ("shape.created", "shape.updated"):
        tool = _tool_from_shape(payload.get("shape") if isinstance(payload, dict) else None)
    if tool is None and event_type == "shape.deleted":
        tool = "eraser"

    event = ReplayEvent(
        t=elapsed_ms_since_round_start(session),
        type=event_type,
        player_id=str(player_id),
        tool=tool,
        payload=payload,
    )

    timeline = list(drawing.timeline or [])
    timeline.append(event.model_dump(mode="json"))
    drawing.timeline = timeline
    flag_modified(drawing, "timeline")
    # Caller owns commit (canvas services commit after mutations).


def _duration_ms(events: list[dict[str, Any]]) -> int:
    if not events:
        return 0
    last = events[-1]
    t = last.get("t") if isinstance(last, dict) else None
    return int(t) if isinstance(t, (int, float)) else 0


def _parse_events(raw: Any) -> list[ReplayEvent]:
    if not isinstance(raw, list):
        return []
    out: list[ReplayEvent] = []
    for item in raw:
        try:
            out.append(ReplayEvent.model_validate(item))
        except Exception:
            continue
    return out


def _drawing_to_replay(drawing: Drawing) -> DrawingReplay:
    events = _parse_events(drawing.timeline)
    author = drawing.author
    published = drawing.published_at
    return DrawingReplay(
        version=1,
        meta=DrawingReplayMeta(
            drawing_id=drawing.id,
            session_id=drawing.session_id,
            turn_number=int(drawing.turn_number),
            word=drawing.word,
            author_id=drawing.author_id,
            author_name=author.name if author is not None else None,
            duration_ms=_duration_ms(list(drawing.timeline or [])),
            event_count=len(events),
            published_at=published.isoformat() if published is not None else None,
        ),
        events=events,
    )


def get_drawing_replay(db: Session, drawing_id: UUID) -> DrawingReplay:
    drawing = db.scalar(
        select(Drawing)
        .where(Drawing.id == drawing_id)
        .options(selectinload(Drawing.author))
    )
    if drawing is None:
        raise ReplayError("NOT_FOUND", "Drawing not found.", status_code=404)
    if drawing.status not in (DRAWING_STATUS_PUBLISHED,):
        # Allow in-progress only if timeline exists and round already ended?
        # Keep strict: published only so clients don't peek mid-round.
        if drawing.status != DRAWING_STATUS_PUBLISHED:
            raise ReplayError(
                "NOT_READY",
                "Replay is available after the round is published.",
                status_code=409,
            )
    return _drawing_to_replay(drawing)


def get_game_replay(db: Session, game_id: UUID) -> GameReplayResponse:
    """Load all published drawing timelines for a game session (ordered by turn)."""
    drawings = list(
        db.scalars(
            select(Drawing)
            .where(
                Drawing.session_id == game_id,
                Drawing.status == DRAWING_STATUS_PUBLISHED,
            )
            .options(selectinload(Drawing.author))
            .order_by(Drawing.turn_number.asc())
        ).all()
    )

    if not drawings:
        # Distinguish unknown session vs empty (no drawings yet).
        session = db.get(GameSession, game_id)
        if session is None:
            raise ReplayError("NOT_FOUND", "Game not found.", status_code=404)
        return GameReplayResponse(
            version=1,
            game_id=game_id,
            room_id=session.room_id,
            drawings=[],
        )

    room_id = drawings[0].room_id
    return GameReplayResponse(
        version=1,
        game_id=game_id,
        room_id=room_id,
        drawings=[_drawing_to_replay(d) for d in drawings],
    )
