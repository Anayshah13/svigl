from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class CreateRoomRequest(BaseModel):
    max_players: int = Field(default=8, ge=2, le=16)


class PlayerResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    avatar_url: str | None


class RoomResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    code: str
    host_id: UUID
    status: str
    max_players: int
    created_at: datetime
    players: list[PlayerResponse]

    @classmethod
    def from_room(cls, room: object) -> "RoomResponse":
        from app.models.room import Room

        assert isinstance(room, Room)
        return cls(
            id=room.id,
            code=room.code,
            host_id=room.host_id,
            status=room.status,
            max_players=room.max_players,
            created_at=room.created_at,
            players=[
                PlayerResponse(
                    id=rp.user.id,
                    name=rp.user.name,
                    avatar_url=rp.user.avatar_url,
                )
                for rp in room.players
            ],
        )
