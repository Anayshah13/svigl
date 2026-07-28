"""Unified drawing + reaction lifecycle for live rounds and the gallery.

Design
------
- One ``drawings`` row is created when a round becomes active.
- Live reactions write to ``drawing_reactions`` and denormalized counts on
  that row — never to the author's profile counters mid-game.
- On round end the canvas snapshot is attached and status flips to
  ``published``; only then are ``User.likes_received`` /
  ``dislikes_received`` updated from the drawing's accumulated counts.
- Gallery reactions reuse the same tables and apply profile deltas only when
  the drawing is already published.
"""

from __future__ import annotations

import time
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any, Literal
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import Select, func, or_, select
from sqlalchemy.orm import Session, selectinload

from app.models.canvas import CanvasState
from app.models.drawing import (
    DRAWING_STATUS_ABANDONED,
    DRAWING_STATUS_IN_PROGRESS,
    DRAWING_STATUS_PUBLISHED,
    REACTION_DISLIKE,
    REACTION_LIKE,
    Drawing,
    DrawingReaction,
)
from app.models.room import (
    GAME_PHASE_ROUND_ACTIVE,
    GAME_PHASE_ROUND_END,
    GameSession,
    Room,
)
from app.models.user import User

ReactionValue = Literal["like", "dislike"]
ReactionInput = ReactionValue | None

WHITEBOARD_VIEWBOX = {"width": 800, "height": 800}


class DrawingError(Exception):
    def __init__(self, code: str, message: str, *, status_code: int = 400) -> None:
        super().__init__(message)
        self.code = code
        self.message = message
        self.status_code = status_code


@dataclass(frozen=True)
class ReactionState:
    drawing_id: UUID
    likes: int
    dislikes: int
    my_reaction: ReactionValue | None
    user_id: UUID | None = None
    reaction: ReactionValue | None = None  # actor's new value after mutation
    previous_reaction: ReactionValue | None = None

    @property
    def changed(self) -> bool:
        return self.previous_reaction != self.reaction

    def as_payload(self) -> dict[str, Any]:
        return {
            "drawing_id": str(self.drawing_id),
            "likes": self.likes,
            "dislikes": self.dislikes,
            "my_reaction": self.my_reaction,
            "user_id": str(self.user_id) if self.user_id else None,
            "reaction": self.reaction,
        }


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _empty_document(shapes: list | None = None) -> dict[str, Any]:
    return {
        "version": 1,
        "viewBox": dict(WHITEBOARD_VIEWBOX),
        "shapes": list(shapes or []),
        "exportedAt": int(time.time() * 1000),
    }


def create_in_progress_drawing(
    db: Session,
    *,
    room: Room,
    session: GameSession,
    author_id: UUID,
    word: str,
) -> Drawing:
    """Allocate a drawing id for the current turn so live reactions can attach.

    Also starts an empty ``timeline`` buffer; canvas commits append timed
    ReplayEvents during ROUND_ACTIVE (see ``app.services.replay``).
    """
    existing = db.scalar(
        select(Drawing).where(
            Drawing.session_id == session.id,
            Drawing.turn_number == session.current_turn,
        )
    )
    if existing is not None:
        session.current_drawing_id = existing.id
        if existing.timeline is None:
            existing.timeline = []
        return existing

    drawing = Drawing(
        author_id=author_id,
        room_id=room.id,
        session_id=session.id,
        turn_number=session.current_turn,
        word=word[:64],
        document=None,
        timeline=[],
        status=DRAWING_STATUS_IN_PROGRESS,
        likes_count=0,
        dislikes_count=0,
    )
    db.add(drawing)
    db.flush()
    session.current_drawing_id = drawing.id
    return drawing


def _load_canvas_shapes(db: Session, session_id: UUID) -> list:
    canvas = db.scalar(
        select(CanvasState).where(CanvasState.session_id == session_id)
    )
    if canvas is None or not isinstance(canvas.shapes, list):
        return []
    return list(canvas.shapes)


def publish_drawing(
    db: Session,
    drawing_id: UUID | None,
    *,
    session: GameSession | None = None,
) -> Drawing | None:
    """Snapshot canvas onto the drawing, mark published, credit author stats.

    Profile counters are updated exactly once at publish time from the
    drawing's denormalized reaction totals (not per live reaction).

    Replay: ``timeline`` was appended live during ROUND_ACTIVE; we only ensure
    it is a list before flipping to published. Gallery thumbnails keep using
    ``document`` (WhiteboardExport); clients load ``timeline`` via the replay API.
    """
    if drawing_id is None:
        return None

    drawing = db.get(Drawing, drawing_id)
    if drawing is None:
        return None
    if drawing.status == DRAWING_STATUS_PUBLISHED:
        return drawing
    if drawing.status == DRAWING_STATUS_ABANDONED:
        return drawing

    shapes = _load_canvas_shapes(db, drawing.session_id)
    # Canonical static snapshot for gallery / profile (WhiteboardExport).
    drawing.document = _empty_document(shapes)
    if drawing.timeline is None:
        drawing.timeline = []
    drawing.status = DRAWING_STATUS_PUBLISHED
    drawing.published_at = utcnow()

    author = db.get(User, drawing.author_id)
    if author is not None:
        author.likes_received = int(author.likes_received or 0) + int(
            drawing.likes_count or 0
        )
        author.dislikes_received = int(author.dislikes_received or 0) + int(
            drawing.dislikes_count or 0
        )

    if session is not None and session.current_drawing_id == drawing.id:
        # Keep id through ROUND_END so clients can still react briefly.
        pass

    db.flush()
    return drawing


def abandon_drawing(db: Session, drawing_id: UUID | None) -> Drawing | None:
    if drawing_id is None:
        return None
    drawing = db.get(Drawing, drawing_id)
    if drawing is None or drawing.status != DRAWING_STATUS_IN_PROGRESS:
        return drawing
    drawing.status = DRAWING_STATUS_ABANDONED
    drawing.document = _empty_document(_load_canvas_shapes(db, drawing.session_id))
    db.flush()
    return drawing


def reaction_summary(
    db: Session,
    drawing_id: UUID,
    *,
    viewer_id: UUID | None = None,
) -> ReactionState:
    drawing = db.get(Drawing, drawing_id)
    if drawing is None:
        raise DrawingError("NOT_FOUND", "Drawing not found.", status_code=404)

    my: ReactionValue | None = None
    if viewer_id is not None:
        row = db.scalar(
            select(DrawingReaction).where(
                DrawingReaction.drawing_id == drawing_id,
                DrawingReaction.user_id == viewer_id,
            )
        )
        if row is not None and row.value in (REACTION_LIKE, REACTION_DISLIKE):
            my = row.value  # type: ignore[assignment]

    return ReactionState(
        drawing_id=drawing.id,
        likes=int(drawing.likes_count or 0),
        dislikes=int(drawing.dislikes_count or 0),
        my_reaction=my,
    )


def _apply_profile_delta(
    author: User | None,
    *,
    likes_delta: int,
    dislikes_delta: int,
) -> None:
    """Adjust author profile counters after a published drawing's reaction change."""
    if author is None:
        return
    if likes_delta:
        author.likes_received = max(0, int(author.likes_received or 0) + likes_delta)
    if dislikes_delta:
        author.dislikes_received = max(
            0, int(author.dislikes_received or 0) + dislikes_delta
        )


def set_reaction(
    db: Session,
    *,
    drawing_id: UUID,
    user_id: UUID,
    reaction: ReactionInput,
    allow_author: bool = False,
    require_room_member: Room | None = None,
    live_phases_only: bool = False,
) -> ReactionState:
    """Upsert/clear a user's reaction. One active value per (drawing, user)."""
    drawing = db.get(Drawing, drawing_id)
    if drawing is None:
        raise DrawingError("NOT_FOUND", "Drawing not found.", status_code=404)

    if drawing.status == DRAWING_STATUS_ABANDONED:
        raise DrawingError(
            "GONE", "This drawing is no longer accepting reactions.", status_code=410
        )

    if not allow_author and drawing.author_id == user_id:
        raise DrawingError(
            "FORBIDDEN",
            "You can't react to your own drawing.",
            status_code=403,
        )

    if require_room_member is not None:
        member_ids = {rp.user_id for rp in require_room_member.players}
        if user_id not in member_ids:
            raise DrawingError(
                "FORBIDDEN",
                "You must be in the room to react.",
                status_code=403,
            )

    if live_phases_only:
        session = require_room_member.game_session if require_room_member else None
        if session is None or session.phase not in (
            GAME_PHASE_ROUND_ACTIVE,
            GAME_PHASE_ROUND_END,
        ):
            raise DrawingError(
                "CONFLICT",
                "Reactions are only available during the drawing round.",
                status_code=409,
            )
        if drawing.status not in (
            DRAWING_STATUS_IN_PROGRESS,
            DRAWING_STATUS_PUBLISHED,
        ):
            raise DrawingError(
                "CONFLICT",
                "Reactions are only available during the drawing round.",
                status_code=409,
            )

    if reaction is not None and reaction not in (REACTION_LIKE, REACTION_DISLIKE):
        raise DrawingError("UNKNOWN", "reaction must be like, dislike, or null.")

    existing = db.scalar(
        select(DrawingReaction).where(
            DrawingReaction.drawing_id == drawing_id,
            DrawingReaction.user_id == user_id,
        )
    )

    likes_delta = 0
    dislikes_delta = 0
    previous = existing.value if existing is not None else None

    if reaction is None:
        if existing is None:
            return ReactionState(
                drawing_id=drawing.id,
                likes=int(drawing.likes_count or 0),
                dislikes=int(drawing.dislikes_count or 0),
                my_reaction=None,
                user_id=user_id,
                reaction=None,
                previous_reaction=None,
            )
        if previous == REACTION_LIKE:
            likes_delta = -1
        elif previous == REACTION_DISLIKE:
            dislikes_delta = -1
        db.delete(existing)
        new_value: ReactionValue | None = None
    elif existing is None:
        db.add(
            DrawingReaction(
                drawing_id=drawing_id,
                user_id=user_id,
                value=reaction,
            )
        )
        if reaction == REACTION_LIKE:
            likes_delta = 1
        else:
            dislikes_delta = 1
        new_value = reaction
    elif previous == reaction:
        new_value = reaction
    else:
        # Switch like ↔ dislike.
        if previous == REACTION_LIKE:
            likes_delta = -1
            dislikes_delta = 1
        else:
            likes_delta = 1
            dislikes_delta = -1
        existing.value = reaction
        new_value = reaction

    if likes_delta or dislikes_delta:
        drawing.likes_count = max(0, int(drawing.likes_count or 0) + likes_delta)
        drawing.dislikes_count = max(
            0, int(drawing.dislikes_count or 0) + dislikes_delta
        )
        # Profile stats only move for already-published drawings.
        if drawing.status == DRAWING_STATUS_PUBLISHED:
            author = db.get(User, drawing.author_id)
            _apply_profile_delta(
                author, likes_delta=likes_delta, dislikes_delta=dislikes_delta
            )

    db.flush()
    return ReactionState(
        drawing_id=drawing.id,
        likes=int(drawing.likes_count or 0),
        dislikes=int(drawing.dislikes_count or 0),
        my_reaction=new_value,
        user_id=user_id,
        reaction=new_value,
        previous_reaction=previous,
    )


def set_live_reaction(
    db: Session,
    room_code: str,
    user_id: UUID,
    *,
    reaction: ReactionInput,
    drawing_id: UUID | None = None,
) -> ReactionState:
    """Room-scoped reaction toggle used by the WebSocket handler."""
    from app.services.room import _get_room_or_404

    room = _get_room_or_404(db, room_code)
    session = room.game_session
    if session is None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="No active game in this room.",
        )

    target_id = drawing_id or session.current_drawing_id
    if target_id is None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="No drawing is accepting reactions right now.",
        )

    try:
        state = set_reaction(
            db,
            drawing_id=target_id,
            user_id=user_id,
            reaction=reaction,
            require_room_member=room,
            live_phases_only=True,
        )
        db.commit()
        return state
    except DrawingError as exc:
        db.rollback()
        raise HTTPException(status_code=exc.status_code, detail=exc.message) from exc


def _gallery_base_query(
    *,
    author_id: UUID | None = None,
    q: str | None = None,
) -> Select[tuple[Drawing]]:
    stmt = (
        select(Drawing)
        .where(Drawing.status == DRAWING_STATUS_PUBLISHED)
        .options(selectinload(Drawing.author))
    )
    if author_id is not None:
        stmt = stmt.where(Drawing.author_id == author_id)
    if q:
        pattern = f"%{q.strip()}%"
        stmt = stmt.join(Drawing.author).where(
            or_(
                Drawing.word.ilike(pattern),
                User.name.ilike(pattern),
            )
        )
    return stmt


def list_gallery(
    db: Session,
    *,
    sort: Literal["recent", "top"] = "recent",
    author_id: UUID | None = None,
    q: str | None = None,
    limit: int = 48,
    offset: int = 0,
    viewer_id: UUID | None = None,
) -> list[tuple[Drawing, ReactionValue | None]]:
    limit = max(1, min(limit, 100))
    offset = max(0, offset)
    stmt = _gallery_base_query(author_id=author_id, q=q)
    if sort == "top":
        stmt = stmt.order_by(
            Drawing.likes_count.desc(),
            Drawing.published_at.desc().nullslast(),
            Drawing.created_at.desc(),
        )
    else:
        stmt = stmt.order_by(
            Drawing.published_at.desc().nullslast(),
            Drawing.created_at.desc(),
        )
    drawings = list(db.scalars(stmt.offset(offset).limit(limit)).unique().all())

    my_map: dict[UUID, ReactionValue] = {}
    if viewer_id is not None and drawings:
        ids = [d.id for d in drawings]
        rows = db.scalars(
            select(DrawingReaction).where(
                DrawingReaction.drawing_id.in_(ids),
                DrawingReaction.user_id == viewer_id,
            )
        ).all()
        for row in rows:
            if row.value in (REACTION_LIKE, REACTION_DISLIKE):
                my_map[row.drawing_id] = row.value  # type: ignore[assignment]

    return [(d, my_map.get(d.id)) for d in drawings]


def set_gallery_reaction(
    db: Session,
    *,
    drawing_id: UUID,
    user_id: UUID,
    reaction: ReactionInput,
) -> ReactionState:
    drawing = db.get(Drawing, drawing_id)
    if drawing is None or drawing.status != DRAWING_STATUS_PUBLISHED:
        raise DrawingError(
            "NOT_FOUND",
            "Only published drawings can be reacted to here.",
            status_code=404,
        )
    try:
        state = set_reaction(
            db,
            drawing_id=drawing_id,
            user_id=user_id,
            reaction=reaction,
        )
        db.commit()
        return state
    except DrawingError:
        db.rollback()
        raise


def gallery_count(
    db: Session, *, author_id: UUID | None = None, q: str | None = None
) -> int:
    stmt = select(func.count()).select_from(Drawing).where(
        Drawing.status == DRAWING_STATUS_PUBLISHED
    )
    if author_id is not None:
        stmt = stmt.where(Drawing.author_id == author_id)
    if q:
        pattern = f"%{q.strip()}%"
        stmt = stmt.where(Drawing.word.ilike(pattern))
    return int(db.scalar(stmt) or 0)
