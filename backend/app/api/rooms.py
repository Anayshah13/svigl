from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.room import CreateRoomRequest, RoomResponse, TargetPlayerRequest
from app.services.room import (
    create_room,
    get_room,
    get_user_active_room,
    join_room,
    kick_player,
    leave_room,
    touch_room_presence,
    transfer_host,
)

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
    return RoomResponse.from_room(room)


@router.post("", response_model=RoomResponse, status_code=status.HTTP_201_CREATED)
def create(
    body: CreateRoomRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> RoomResponse:
    room = create_room(db, host_id=current_user.id, max_players=body.max_players)
    return RoomResponse.from_room(room)


@router.post("/{code}/join", response_model=RoomResponse)
def join(
    code: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> RoomResponse:
    room = join_room(db, code=code, user_id=current_user.id)
    return RoomResponse.from_room(room)


@router.post("/{code}/leave", status_code=status.HTTP_200_OK)
def leave(
    code: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> RoomResponse | dict[str, str]:
    room = leave_room(db, code=code, user_id=current_user.id)
    if room is None:
        return {"detail": "Room deleted (no players remain)."}
    return RoomResponse.from_room(room)


@router.post("/{code}/kick", response_model=RoomResponse)
def kick(
    code: str,
    body: TargetPlayerRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> RoomResponse:
    room = kick_player(
        db, code=code, host_id=current_user.id, target_id=body.player_id
    )
    if room is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Room not found.",
        )
    return RoomResponse.from_room(room)


@router.post("/{code}/transfer-host", response_model=RoomResponse)
def transfer(
    code: str,
    body: TargetPlayerRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> RoomResponse:
    room = transfer_host(
        db, code=code, host_id=current_user.id, new_host_id=body.player_id
    )
    return RoomResponse.from_room(room)


@router.post("/{code}/presence", response_model=RoomResponse)
def presence(
    code: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> RoomResponse:
    room = touch_room_presence(db, code=code, user_id=current_user.id)
    if room is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Room not found.",
        )
    return RoomResponse.from_room(room)


@router.get("/{code}", response_model=RoomResponse)
def detail(
    code: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> RoomResponse:
    room = get_room(db, code=code)
    return RoomResponse.from_room(room)
