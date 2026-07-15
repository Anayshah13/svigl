from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.room import CreateRoomRequest, RoomResponse, TargetPlayerRequest
from app.services.game_runtime import (
    apply_mutation_side_effects,
    game_runtime,
    reconcile_room_session,
)
from app.services.room import (
    _load_room,
    create_room,
    ensure_room_game_defaults,
    get_room,
    get_user_active_room,
    join_room,
    kick_player,
    leave_room,
    touch_room_presence,
    transfer_host,
)
from app.websocket.events import EventType
from app.websocket.notify import (
    fire_and_forget,
    notify_game_mutation,
    notify_host_changed,
    notify_player_joined,
    notify_player_kicked,
    notify_player_left,
    notify_player_waiting,
    notify_room_updated,
)
from app.websocket.room_manager import room_manager

router = APIRouter(prefix="/rooms", tags=["rooms"])


@router.get("/active", response_model=RoomResponse)
def active(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> RoomResponse:
    room = get_user_active_room(db, user_id=current_user.id)
    if room is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Not in an active room.",
        )
    return RoomResponse.from_room(room, viewer_id=current_user.id)


@router.post("", response_model=RoomResponse, status_code=status.HTTP_201_CREATED)
def create(
    body: CreateRoomRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> RoomResponse:
    room = create_room(db, host_id=current_user.id, max_players=body.max_players)
    return RoomResponse.from_room(room, viewer_id=current_user.id)


@router.post("/{code}/join", response_model=RoomResponse)
def join(
    code: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> RoomResponse:
    change = join_room(db, code=code, user_id=current_user.id)
    assert change.room is not None
    if change.joined_as_waiting:
        notify_player_waiting(change.room, current_user.id, current_user.name)
    else:
        notify_player_joined(change.room, current_user.id, current_user.name)
    return RoomResponse.from_room(change.room, viewer_id=current_user.id)


@router.post("/{code}/leave", status_code=status.HTTP_200_OK)
def leave(
    code: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> RoomResponse | dict[str, str]:
    change = leave_room(db, code=code, user_id=current_user.id)
    apply_mutation_side_effects(change.game_mutation)
    if change.room is None:
        game_runtime.stop(code.upper())
        notify_player_left(code.upper(), current_user.id, current_user.name)
        return {"detail": "Room deleted (no players remain)."}
    notify_player_left(code.upper(), current_user.id, current_user.name, change.room)
    notify_game_mutation(change.game_mutation, change.room)
    if change.host_changed and change.previous_host_id is not None:
        notify_host_changed(change.room, change.previous_host_id)
    return RoomResponse.from_room(change.room, viewer_id=current_user.id)


@router.post("/{code}/kick", response_model=RoomResponse)
def kick(
    code: str,
    body: TargetPlayerRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> RoomResponse:
    room_row = _load_room(db, code=code)
    if room_row is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Room not found.",
        )
    ensure_room_game_defaults(db, room_row, commit=True)

    target_player = next(
        (rp for rp in room_row.players if rp.user_id == body.player_id),
        None,
    )
    target_name = target_player.user.name if target_player else "Unknown"

    change = kick_player(
        db, code=code, host_id=current_user.id, target_id=body.player_id
    )
    if change.room is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Room not found.",
        )
    apply_mutation_side_effects(change.game_mutation)
    notify_player_kicked(change.room, body.player_id, target_name)
    notify_game_mutation(change.game_mutation, change.room)
    if change.host_changed and change.previous_host_id is not None:
        notify_host_changed(change.room, change.previous_host_id)
    return RoomResponse.from_room(change.room, viewer_id=current_user.id)


@router.post("/{code}/transfer-host", response_model=RoomResponse)
def transfer(
    code: str,
    body: TargetPlayerRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> RoomResponse:
    change = transfer_host(
        db, code=code, host_id=current_user.id, new_host_id=body.player_id
    )
    assert change.room is not None
    if change.host_changed and change.previous_host_id is not None:
        notify_host_changed(change.room, change.previous_host_id)
    else:
        notify_room_updated(change.room)
    return RoomResponse.from_room(change.room, viewer_id=current_user.id)


@router.post("/{code}/presence", response_model=RoomResponse)
def presence(
    code: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> RoomResponse:
    change, evicted = touch_room_presence(db, code=code, user_id=current_user.id)
    apply_mutation_side_effects(change.game_mutation)
    if change.room is None:
        if evicted:
            fire_and_forget(
                room_manager.broadcast(
                    code.upper(),
                    EventType.PLAYER_LEFT,
                    room_deleted=True,
                )
            )
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Room not found.",
        )
    # Self-heal stuck timers if the in-process monitor died (e.g. reload).
    due = reconcile_room_session(db, change.room)
    if due is not None:
        apply_mutation_side_effects(due)
        notify_game_mutation(due, change.room)
    if evicted:
        notify_room_updated(change.room)
        notify_game_mutation(change.game_mutation, change.room)
        if change.host_changed and change.previous_host_id is not None:
            notify_host_changed(change.room, change.previous_host_id)
    return RoomResponse.from_room(change.room, viewer_id=current_user.id)


@router.get("/{code}", response_model=RoomResponse)
def detail(
    code: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> RoomResponse:
    room = get_room(db, code=code)
    due = reconcile_room_session(db, room)
    if due is not None:
        apply_mutation_side_effects(due)
        notify_game_mutation(due, room)
    return RoomResponse.from_room(room, viewer_id=current_user.id)
