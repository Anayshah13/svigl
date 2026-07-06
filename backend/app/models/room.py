from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    ForeignKey,
    Integer,
    String,
    UniqueConstraint,
    Uuid,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.database import Base

ROOM_STATUS_WAITING = "WAITING"
ROOM_STATUS_PLAYING = "PLAYING"
ROOM_STATUS_FINISHED = "FINISHED"


class Room(Base):
    __tablename__ = "rooms"
    __table_args__ = (
        CheckConstraint(
            "status IN ('WAITING', 'PLAYING', 'FINISHED')",
            name="ck_rooms_status",
        ),
        CheckConstraint("max_players >= 2", name="ck_rooms_max_players"),
    )

    id: Mapped[UUID] = mapped_column(Uuid, primary_key=True, default=uuid4)
    code: Mapped[str] = mapped_column(String(4), unique=True, index=True, nullable=False)
    host_id: Mapped[UUID] = mapped_column(
        Uuid, ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    status: Mapped[str] = mapped_column(
        String(16), nullable=False, default=ROOM_STATUS_WAITING
    )
    max_players: Mapped[int] = mapped_column(Integer, nullable=False, default=8)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    host = relationship("User", foreign_keys=[host_id], lazy="joined")
    players: Mapped[list["RoomPlayer"]] = relationship(
        back_populates="room",
        cascade="all, delete-orphan",
        order_by="RoomPlayer.joined_at",
        lazy="joined",
    )


class RoomPlayer(Base):
    __tablename__ = "room_players"
    __table_args__ = (
        UniqueConstraint("room_id", "user_id", name="uq_room_players_room_user"),
    )

    id: Mapped[UUID] = mapped_column(Uuid, primary_key=True, default=uuid4)
    room_id: Mapped[UUID] = mapped_column(
        Uuid, ForeignKey("rooms.id", ondelete="CASCADE"), nullable=False, index=True
    )
    user_id: Mapped[UUID] = mapped_column(
        Uuid, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    joined_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    room: Mapped["Room"] = relationship(back_populates="players")
    user = relationship("User", lazy="joined")
