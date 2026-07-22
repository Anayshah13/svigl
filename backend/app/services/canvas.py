"""Authoritative collaborative canvas mutations (drawer-only)."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any
from uuid import UUID

from sqlalchemy.orm import Session

from app.models.canvas import CanvasState
from app.models.room import (
    GAME_PHASE_ROUND_ACTIVE,
    GameSession,
    Room,
)
from app.schemas.canvas import (
    HistoryAddOp,
    HistoryClearOp,
    HistoryOp,
    HistoryRemoveOp,
    HistoryReplaceOp,
    HistoryUpdateOp,
    WhiteboardShape,
    parse_history_op,
    parse_shape,
    parse_shapes,
    shape_to_dict,
    shapes_to_dicts,
)
from app.services.room import _load_room


class CanvasError(Exception):
    def __init__(self, code: str, detail: str) -> None:
        self.code = code
        self.detail = detail
        super().__init__(detail)


@dataclass(frozen=True)
class CanvasBroadcast:
    room_code: str
    event: str
    payload: dict[str, Any]
    exclude_user_id: UUID | None = None


def _room(db: Session, room_code: str) -> Room:
    room = _load_room(db, code=room_code)
    if room is None:
        raise CanvasError("ROOM_NOT_FOUND", "Room not found.")
    return room


def _session(room: Room) -> GameSession:
    session = room.game_session
    if session is None:
        raise CanvasError("NO_SESSION", "No active game session.")
    return session


def _assert_drawer(session: GameSession, user_id: UUID) -> None:
    if session.phase != GAME_PHASE_ROUND_ACTIVE:
        raise CanvasError(
            "NOT_DRAWING_PHASE",
            "Canvas can only be mutated during an active round.",
        )
    if session.drawer_user_id != user_id:
        raise CanvasError(
            "NOT_DRAWER",
            "Only the current drawer can mutate the canvas.",
        )


def _get_or_create_canvas(db: Session, room: Room, session: GameSession) -> CanvasState:
    canvas = (
        db.query(CanvasState)
        .filter(CanvasState.session_id == session.id)
        .first()
    )
    if canvas is not None:
        return canvas
    canvas = CanvasState(
        session_id=session.id,
        room_id=room.id,
        current_turn=session.current_turn,
        shapes=[],
        undo_stack=[],
        redo_stack=[],
        op_seq=0,
    )
    db.add(canvas)
    db.flush()
    return canvas


def _load_shapes(canvas: CanvasState) -> list[WhiteboardShape]:
    try:
        return parse_shapes(canvas.shapes or [])
    except Exception as exc:
        raise CanvasError("INVALID_CANVAS", f"Corrupt canvas shapes: {exc}") from exc


def _store_shapes(canvas: CanvasState, shapes: list[WhiteboardShape]) -> None:
    canvas.shapes = shapes_to_dicts(shapes)


def _load_stack(raw: Any) -> list[dict[str, Any]]:
    if not isinstance(raw, list):
        return []
    return list(raw)


def _push_undo(canvas: CanvasState, op: HistoryOp, *, limit: int = 100) -> None:
    stack = _load_stack(canvas.undo_stack)
    stack.append(op.model_dump(mode="json"))
    if len(stack) > limit:
        stack = stack[-limit:]
    canvas.undo_stack = stack
    canvas.redo_stack = []


def _bump(canvas: CanvasState) -> int:
    canvas.op_seq = int(canvas.op_seq or 0) + 1
    return canvas.op_seq


def snapshot_payload(
    canvas: CanvasState | None,
    *,
    session: GameSession | None,
    user_id: UUID | None = None,
) -> dict[str, Any]:
    if canvas is None or session is None:
        return {
            "session_id": str(session.id) if session is not None else None,
            "current_turn": session.current_turn if session is not None else 0,
            "op_seq": 0,
            "shapes": [],
            "can_draw": False,
        }
    can_draw = (
        user_id is not None
        and session.phase == GAME_PHASE_ROUND_ACTIVE
        and session.drawer_user_id == user_id
    )
    try:
        shapes = shapes_to_dicts(_load_shapes(canvas))
    except CanvasError:
        shapes = []
    return {
        "session_id": str(session.id),
        "current_turn": canvas.current_turn,
        "op_seq": canvas.op_seq,
        "shapes": shapes,
        "can_draw": can_draw,
    }


def get_canvas_snapshot(
    db: Session, room_code: str, *, user_id: UUID | None = None
) -> dict[str, Any]:
    room = _room(db, room_code)
    session = room.game_session
    if session is None:
        return snapshot_payload(None, session=None, user_id=user_id)
    canvas = (
        db.query(CanvasState)
        .filter(CanvasState.session_id == session.id)
        .first()
    )
    return snapshot_payload(canvas, session=session, user_id=user_id)


def clear_canvas_for_round(
    db: Session, room: Room, session: GameSession, *, commit: bool = True
) -> CanvasState:
    """Reset canvas for a new round / drawer. Idempotent."""
    canvas = _get_or_create_canvas(db, room, session)
    canvas.current_turn = session.current_turn
    canvas.shapes = []
    canvas.undo_stack = []
    canvas.redo_stack = []
    _bump(canvas)
    if commit:
        db.commit()
        db.refresh(canvas)
    else:
        db.flush()
    return canvas


def clear_canvas_for_room_code(db: Session, room_code: str) -> dict[str, Any] | None:
    """Used by WS notify when ROUND_STARTED fires."""
    room = _load_room(db, code=room_code)
    if room is None or room.game_session is None:
        return None
    session = room.game_session
    canvas = clear_canvas_for_round(db, room, session, commit=True)
    return {
        "session_id": str(session.id),
        "current_turn": canvas.current_turn,
        "op_seq": canvas.op_seq,
        "shapes": [],
        "reason": "round_started",
    }


def _has_add_for(canvas: CanvasState, shape_id: str) -> bool:
    return any(
        isinstance(item, dict)
        and item.get("type") == "add"
        and isinstance(item.get("shape"), dict)
        and item["shape"].get("id") == shape_id
        for item in _load_stack(canvas.undo_stack)
    )


def apply_shape_created(
    db: Session, room_code: str, user_id: UUID, shape_raw: Any
) -> CanvasBroadcast:
    """
    Commit a finished shape.

    Transient SHAPE_UPDATED previews are never persisted, so the normal path
    pushes one undoable ``add``. A repeated commit safely becomes an update.
    """
    room = _room(db, room_code)
    session = _session(room)
    _assert_drawer(session, user_id)
    shape = parse_shape(shape_raw)
    if shape.createdBy != str(user_id):
        shape = shape.model_copy(update={"createdBy": str(user_id)})

    canvas = _get_or_create_canvas(db, room, session)
    shapes = _load_shapes(canvas)
    existing_idx = next((i for i, s in enumerate(shapes) if s.id == shape.id), None)

    if existing_idx is None:
        shapes.append(shape)
        _store_shapes(canvas, shapes)
        _push_undo(canvas, HistoryAddOp(type="add", shape=shape))
    else:
        before = shapes[existing_idx]
        shapes[existing_idx] = shape
        _store_shapes(canvas, shapes)
        if _has_add_for(canvas, shape.id):
            _push_undo(
                canvas, HistoryUpdateOp(type="update", before=before, after=shape)
            )
        else:
            _push_undo(canvas, HistoryAddOp(type="add", shape=shape))

    op_seq = _bump(canvas)
    db.commit()

    return CanvasBroadcast(
        room_code=room.code,
        event="SHAPE_CREATED",
        payload={
            "shape": shape_to_dict(shape),
            "session_id": str(session.id),
            "current_turn": canvas.current_turn,
            "op_seq": op_seq,
        },
        exclude_user_id=user_id,
    )


def apply_shape_updated(
    db: Session, room_code: str, user_id: UUID, shape_raw: Any
) -> CanvasBroadcast:
    room = _room(db, room_code)
    session = _session(room)
    _assert_drawer(session, user_id)
    after = parse_shape(shape_raw)
    if after.createdBy != str(user_id):
        after = after.model_copy(update={"createdBy": str(user_id)})

    canvas = _get_or_create_canvas(db, room, session)
    shapes = _load_shapes(canvas)
    idx = next((i for i, s in enumerate(shapes) if s.id == after.id), None)
    if idx is None:
        shapes.append(after)
        _store_shapes(canvas, shapes)
        _push_undo(canvas, HistoryAddOp(type="add", shape=after))
    else:
        before = shapes[idx]
        shapes[idx] = after
        _store_shapes(canvas, shapes)
        if before != after:
            _push_undo(
                canvas, HistoryUpdateOp(type="update", before=before, after=after)
            )
    op_seq = _bump(canvas)
    db.commit()

    return CanvasBroadcast(
        room_code=room.code,
        event="SHAPE_UPDATED",
        payload={
            "shape": shape_to_dict(after),
            "session_id": str(session.id),
            "current_turn": canvas.current_turn,
            "op_seq": op_seq,
        },
        exclude_user_id=user_id,
    )


def apply_shape_preview(
    db: Session, room_code: str, user_id: UUID, shape_raw: Any
) -> CanvasBroadcast:
    """Validate and broadcast transient geometry without writing CanvasState."""
    room = _room(db, room_code)
    session = _session(room)
    _assert_drawer(session, user_id)
    shape = parse_shape(shape_raw)
    if shape.createdBy != str(user_id):
        shape = shape.model_copy(update={"createdBy": str(user_id)})
    return CanvasBroadcast(
        room_code=room.code,
        event="SHAPE_UPDATED",
        payload={
            "shape": shape_to_dict(shape),
            "session_id": str(session.id),
            "current_turn": session.current_turn,
            "ephemeral": True,
        },
        exclude_user_id=user_id,
    )


def apply_shape_preview_deleted(
    db: Session, room_code: str, user_id: UUID, shape_id: str
) -> CanvasBroadcast:
    """Remove an abandoned transient creation from remote canvases."""
    room = _room(db, room_code)
    session = _session(room)
    _assert_drawer(session, user_id)
    return CanvasBroadcast(
        room_code=room.code,
        event="SHAPE_DELETED",
        payload={
            "shape_id": shape_id,
            "session_id": str(session.id),
            "current_turn": session.current_turn,
            "ephemeral": True,
        },
        exclude_user_id=user_id,
    )


def apply_shape_deleted(
    db: Session, room_code: str, user_id: UUID, shape_id: str
) -> CanvasBroadcast:
    room = _room(db, room_code)
    session = _session(room)
    _assert_drawer(session, user_id)

    canvas = _get_or_create_canvas(db, room, session)
    shapes = _load_shapes(canvas)
    idx = next((i for i, s in enumerate(shapes) if s.id == shape_id), None)
    if idx is None:
        raise CanvasError("SHAPE_NOT_FOUND", f"Shape {shape_id} not found.")

    removed = shapes.pop(idx)
    _store_shapes(canvas, shapes)
    op = HistoryRemoveOp(type="remove", shape=removed, index=idx)
    _push_undo(canvas, op)
    op_seq = _bump(canvas)
    db.commit()

    return CanvasBroadcast(
        room_code=room.code,
        event="SHAPE_DELETED",
        payload={
            "shape_id": shape_id,
            "session_id": str(session.id),
            "current_turn": canvas.current_turn,
            "op_seq": op_seq,
        },
        exclude_user_id=user_id,
    )


def apply_canvas_cleared(
    db: Session, room_code: str, user_id: UUID
) -> CanvasBroadcast:
    room = _room(db, room_code)
    session = _session(room)
    _assert_drawer(session, user_id)

    canvas = _get_or_create_canvas(db, room, session)
    shapes = _load_shapes(canvas)
    op = HistoryClearOp(type="clear", shapes=shapes)
    canvas.shapes = []
    _push_undo(canvas, op)
    op_seq = _bump(canvas)
    db.commit()

    return CanvasBroadcast(
        room_code=room.code,
        event="CANVAS_CLEARED",
        payload={
            "session_id": str(session.id),
            "current_turn": canvas.current_turn,
            "op_seq": op_seq,
            "reason": "drawer_clear",
        },
        exclude_user_id=user_id,
    )


def _apply_forward(shapes: list[WhiteboardShape], op: HistoryOp) -> list[WhiteboardShape]:
    if isinstance(op, HistoryAddOp):
        return [*shapes, op.shape]
    if isinstance(op, HistoryRemoveOp):
        return [s for s in shapes if s.id != op.shape.id]
    if isinstance(op, HistoryUpdateOp):
        return [op.after if s.id == op.after.id else s for s in shapes]
    if isinstance(op, HistoryClearOp):
        return []
    if isinstance(op, HistoryReplaceOp):
        return list(op.after)
    raise CanvasError("INVALID_OP", "Unknown history op.")


def _apply_inverse(shapes: list[WhiteboardShape], op: HistoryOp) -> list[WhiteboardShape]:
    if isinstance(op, HistoryAddOp):
        return [s for s in shapes if s.id != op.shape.id]
    if isinstance(op, HistoryRemoveOp):
        next_shapes = list(shapes)
        next_shapes.insert(min(op.index, len(next_shapes)), op.shape)
        return next_shapes
    if isinstance(op, HistoryUpdateOp):
        return [op.before if s.id == op.before.id else s for s in shapes]
    if isinstance(op, HistoryClearOp):
        return list(op.shapes)
    if isinstance(op, HistoryReplaceOp):
        return list(op.before)
    raise CanvasError("INVALID_OP", "Unknown history op.")


def apply_undo(db: Session, room_code: str, user_id: UUID) -> CanvasBroadcast:
    room = _room(db, room_code)
    session = _session(room)
    _assert_drawer(session, user_id)

    canvas = _get_or_create_canvas(db, room, session)
    undo_stack = _load_stack(canvas.undo_stack)
    if not undo_stack:
        raise CanvasError("NOTHING_TO_UNDO", "Nothing to undo.")

    raw_op = undo_stack.pop()
    op = parse_history_op(raw_op)
    shapes = _apply_inverse(_load_shapes(canvas), op)
    _store_shapes(canvas, shapes)
    canvas.undo_stack = undo_stack
    redo = _load_stack(canvas.redo_stack)
    redo.append(raw_op)
    canvas.redo_stack = redo
    op_seq = _bump(canvas)
    db.commit()

    return CanvasBroadcast(
        room_code=room.code,
        event="UNDO",
        payload={
            "op": op.model_dump(mode="json"),
            "shapes": shapes_to_dicts(shapes),
            "session_id": str(session.id),
            "current_turn": canvas.current_turn,
            "op_seq": op_seq,
        },
        exclude_user_id=user_id,
    )


def apply_redo(db: Session, room_code: str, user_id: UUID) -> CanvasBroadcast:
    room = _room(db, room_code)
    session = _session(room)
    _assert_drawer(session, user_id)

    canvas = _get_or_create_canvas(db, room, session)
    redo_stack = _load_stack(canvas.redo_stack)
    if not redo_stack:
        raise CanvasError("NOTHING_TO_REDO", "Nothing to redo.")

    raw_op = redo_stack.pop()
    op = parse_history_op(raw_op)
    shapes = _apply_forward(_load_shapes(canvas), op)
    _store_shapes(canvas, shapes)
    canvas.redo_stack = redo_stack
    undo = _load_stack(canvas.undo_stack)
    undo.append(raw_op)
    canvas.undo_stack = undo
    op_seq = _bump(canvas)
    db.commit()

    return CanvasBroadcast(
        room_code=room.code,
        event="REDO",
        payload={
            "op": op.model_dump(mode="json"),
            "shapes": shapes_to_dicts(shapes),
            "session_id": str(session.id),
            "current_turn": canvas.current_turn,
            "op_seq": op_seq,
        },
        exclude_user_id=user_id,
    )


