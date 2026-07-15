"""add game lifecycle

Revision ID: e5f6a7b8c9d0
Revises: d4e5f6a7b8c9
Create Date: 2026-07-15 17:20:00.000000
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "e5f6a7b8c9d0"
down_revision: Union[str, None] = "d4e5f6a7b8c9"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "room_players",
        sa.Column(
            "is_ready",
            sa.Boolean(),
            server_default=sa.text("false"),
            nullable=False,
        ),
    )

    op.create_table(
        "game_settings",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("room_id", sa.Uuid(), nullable=False),
        sa.Column("total_rounds", sa.Integer(), nullable=False),
        sa.Column("round_duration_seconds", sa.Integer(), nullable=False),
        sa.CheckConstraint(
            "round_duration_seconds BETWEEN 10 AND 300",
            name="ck_game_settings_duration",
        ),
        sa.CheckConstraint(
            "total_rounds BETWEEN 1 AND 10", name="ck_game_settings_rounds"
        ),
        sa.ForeignKeyConstraint(["room_id"], ["rooms.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("room_id"),
    )
    op.create_index(
        op.f("ix_game_settings_room_id"), "game_settings", ["room_id"], unique=True
    )

    op.create_table(
        "game_sessions",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("room_id", sa.Uuid(), nullable=False),
        sa.Column("phase", sa.String(length=24), nullable=False),
        sa.Column("deadline_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("revision", sa.Integer(), nullable=False),
        sa.Column("current_turn", sa.Integer(), nullable=False),
        sa.Column("rotation_start_offset", sa.Integer(), nullable=False),
        sa.Column("total_rounds", sa.Integer(), nullable=False),
        sa.Column("round_duration_seconds", sa.Integer(), nullable=False),
        sa.Column("drawer_user_id", sa.Uuid(), nullable=True),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.CheckConstraint(
            "phase IN ('LOBBY', 'COUNTDOWN', 'ROUND_ACTIVE', "
            "'ROUND_END', 'GAME_FINISHED')",
            name="ck_game_sessions_phase",
        ),
        sa.CheckConstraint("current_turn >= 0", name="ck_game_sessions_current_turn"),
        sa.CheckConstraint(
            "rotation_start_offset >= 0", name="ck_game_sessions_offset"
        ),
        sa.CheckConstraint("revision >= 0", name="ck_game_sessions_revision"),
        sa.ForeignKeyConstraint(
            ["drawer_user_id"], ["users.id"], ondelete="SET NULL"
        ),
        sa.ForeignKeyConstraint(["room_id"], ["rooms.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("room_id"),
    )
    op.create_index(
        op.f("ix_game_sessions_room_id"), "game_sessions", ["room_id"], unique=True
    )

    op.create_table(
        "game_session_players",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("session_id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("rotation_index", sa.Integer(), nullable=False),
        sa.Column(
            "is_active",
            sa.Boolean(),
            server_default=sa.text("true"),
            nullable=False,
        ),
        sa.CheckConstraint(
            "rotation_index >= 0", name="ck_game_session_players_rotation"
        ),
        sa.ForeignKeyConstraint(
            ["session_id"], ["game_sessions.id"], ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "session_id", "rotation_index", name="uq_game_session_players_session_rotation"
        ),
        sa.UniqueConstraint(
            "session_id", "user_id", name="uq_game_session_players_session_user"
        ),
    )
    op.create_index(
        op.f("ix_game_session_players_session_id"),
        "game_session_players",
        ["session_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_game_session_players_user_id"),
        "game_session_players",
        ["user_id"],
        unique=False,
    )

    rooms = sa.table(
        "rooms",
        sa.column("id", sa.Uuid()),
    )
    settings = sa.table(
        "game_settings",
        sa.column("id", sa.Uuid()),
        sa.column("room_id", sa.Uuid()),
        sa.column("total_rounds", sa.Integer()),
        sa.column("round_duration_seconds", sa.Integer()),
    )
    connection = op.get_bind()
    for room_id in connection.execute(sa.select(rooms.c.id)).scalars():
        connection.execute(
            settings.insert().values(
                id=__import__("uuid").uuid4(),
                room_id=room_id,
                total_rounds=3,
                round_duration_seconds=60,
            )
        )


def downgrade() -> None:
    op.drop_index(
        op.f("ix_game_session_players_user_id"),
        table_name="game_session_players",
    )
    op.drop_index(
        op.f("ix_game_session_players_session_id"),
        table_name="game_session_players",
    )
    op.drop_table("game_session_players")
    op.drop_index(op.f("ix_game_sessions_room_id"), table_name="game_sessions")
    op.drop_table("game_sessions")
    op.drop_index(op.f("ix_game_settings_room_id"), table_name="game_settings")
    op.drop_table("game_settings")
    op.drop_column("room_players", "is_ready")
