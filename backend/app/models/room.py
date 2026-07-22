from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
    Uuid,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.database import Base

ROOM_STATUS_WAITING = "WAITING"
ROOM_STATUS_PLAYING = "PLAYING"
ROOM_STATUS_FINISHED = "FINISHED"

GAME_PHASE_LOBBY = "LOBBY"
GAME_PHASE_COUNTDOWN = "COUNTDOWN"
GAME_PHASE_WORD_SELECTION = "WORD_SELECTION"
GAME_PHASE_ROUND_ACTIVE = "ROUND_ACTIVE"
GAME_PHASE_ROUND_END = "ROUND_END"
GAME_PHASE_GAME_FINISHED = "GAME_FINISHED"


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
    # selectin avoids LEFT OUTER JOIN row multiplication and Postgres
    # "FOR UPDATE cannot be applied to the nullable side of an outer join".
    players: Mapped[list["RoomPlayer"]] = relationship(
        back_populates="room",
        cascade="all, delete-orphan",
        order_by="RoomPlayer.joined_at",
        lazy="selectin",
    )
    game_settings: Mapped["GameSettings"] = relationship(
        back_populates="room",
        cascade="all, delete-orphan",
        uselist=False,
        lazy="selectin",
    )
    game_session: Mapped["GameSession | None"] = relationship(
        back_populates="room",
        cascade="all, delete-orphan",
        uselist=False,
        lazy="selectin",
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
    last_seen_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    is_ready: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, server_default="false"
    )

    room: Mapped["Room"] = relationship(back_populates="players")
    user = relationship("User", lazy="joined")


class GameSettings(Base):
    __tablename__ = "game_settings"
    __table_args__ = (
        CheckConstraint("total_rounds BETWEEN 1 AND 10", name="ck_game_settings_rounds"),
        CheckConstraint(
            "round_duration_seconds BETWEEN 10 AND 300",
            name="ck_game_settings_duration",
        ),
    )

    id: Mapped[UUID] = mapped_column(Uuid, primary_key=True, default=uuid4)
    room_id: Mapped[UUID] = mapped_column(
        Uuid,
        ForeignKey("rooms.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True,
    )
    total_rounds: Mapped[int] = mapped_column(Integer, nullable=False, default=3)
    round_duration_seconds: Mapped[int] = mapped_column(
        Integer, nullable=False, default=60
    )

    room: Mapped["Room"] = relationship(back_populates="game_settings")


class GameSession(Base):
    __tablename__ = "game_sessions"
    __table_args__ = (
        CheckConstraint(
            "phase IN ('LOBBY', 'COUNTDOWN', 'WORD_SELECTION', 'ROUND_ACTIVE', "
            "'ROUND_END', 'GAME_FINISHED')",
            name="ck_game_sessions_phase",
        ),
        CheckConstraint("revision >= 0", name="ck_game_sessions_revision"),
        CheckConstraint("current_turn >= 0", name="ck_game_sessions_current_turn"),
        CheckConstraint("current_round >= 0", name="ck_game_sessions_current_round"),
        CheckConstraint("rotation_start_offset >= 0", name="ck_game_sessions_offset"),
    )

    id: Mapped[UUID] = mapped_column(Uuid, primary_key=True, default=uuid4)
    room_id: Mapped[UUID] = mapped_column(
        Uuid,
        ForeignKey("rooms.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True,
    )
    phase: Mapped[str] = mapped_column(
        String(24), nullable=False, default=GAME_PHASE_LOBBY
    )
    deadline_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    revision: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    current_turn: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    # 1-based in-game round; 0 in lobby. Display is clamped to total_rounds.
    current_round: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    rotation_start_offset: Mapped[int] = mapped_column(
        Integer, nullable=False, default=0
    )
    total_rounds: Mapped[int] = mapped_column(Integer, nullable=False, default=3)
    round_duration_seconds: Mapped[int] = mapped_column(
        Integer, nullable=False, default=60
    )
    drawer_user_id: Mapped[UUID | None] = mapped_column(
        Uuid, ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    # Secret word is never included in public room snapshots.
    secret_word: Mapped[str | None] = mapped_column(String(64), nullable=True)
    # JSON-encoded list of up to 3 choices offered to the drawer.
    word_choices_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    # JSON list of character indices revealed in the public word hint.
    hint_revealed_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    # Last ROUND_ENDED summary — kept through ROUND_END for snapshot clients.
    last_round_summary_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    round_started_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    winner_user_id: Mapped[UUID | None] = mapped_column(
        Uuid, ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    room: Mapped["Room"] = relationship(back_populates="game_session")
    players: Mapped[list["GameSessionPlayer"]] = relationship(
        back_populates="session",
        cascade="all, delete-orphan",
        order_by="GameSessionPlayer.rotation_index",
        lazy="selectin",
    )


class GameSessionPlayer(Base):
    __tablename__ = "game_session_players"
    __table_args__ = (
        UniqueConstraint(
            "session_id", "user_id", name="uq_game_session_players_session_user"
        ),
        UniqueConstraint(
            "session_id",
            "rotation_index",
            name="uq_game_session_players_session_rotation",
        ),
        CheckConstraint("rotation_index >= 0", name="ck_game_session_players_rotation"),
        CheckConstraint("score >= 0", name="ck_game_session_players_score"),
        CheckConstraint("draws_done >= 0", name="ck_game_session_players_draws_done"),
        CheckConstraint("draw_target >= 0", name="ck_game_session_players_draw_target"),
    )

    id: Mapped[UUID] = mapped_column(Uuid, primary_key=True, default=uuid4)
    session_id: Mapped[UUID] = mapped_column(
        Uuid,
        ForeignKey("game_sessions.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    user_id: Mapped[UUID] = mapped_column(
        Uuid, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    rotation_index: Mapped[int] = mapped_column(Integer, nullable=False)
    is_active: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=True, server_default="true"
    )
    score: Mapped[int] = mapped_column(
        Integer, nullable=False, default=0, server_default="0"
    )
    has_guessed_correctly: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, server_default="false"
    )
    round_points: Mapped[int] = mapped_column(
        Integer, nullable=False, default=0, server_default="0"
    )
    # Completed drawing seats credited this game (not lifetime User.drawings_done).
    draws_done: Mapped[int] = mapped_column(
        Integer, nullable=False, default=0, server_default="0"
    )
    # Draws owed this game; fixed at start/admit (late joiners get remaining rounds).
    draw_target: Mapped[int] = mapped_column(
        Integer, nullable=False, default=0, server_default="0"
    )

    session: Mapped["GameSession"] = relationship(back_populates="players")
    user = relationship("User", lazy="joined")
