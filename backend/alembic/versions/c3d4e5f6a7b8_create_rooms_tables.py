"""create rooms tables

Revision ID: c3d4e5f6a7b8
Revises: b7c8d9e0f1a2
Create Date: 2026-07-07 01:30:00.000000
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "c3d4e5f6a7b8"
down_revision: Union[str, None] = "b7c8d9e0f1a2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "rooms",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("code", sa.String(length=4), nullable=False),
        sa.Column("host_id", sa.Uuid(), nullable=False),
        sa.Column("status", sa.String(length=16), nullable=False, server_default="WAITING"),
        sa.Column("max_players", sa.Integer(), nullable=False, server_default="8"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["host_id"], ["users.id"], ondelete="CASCADE"),
        sa.UniqueConstraint("code"),
        sa.CheckConstraint("status IN ('WAITING', 'PLAYING', 'FINISHED')", name="ck_rooms_status"),
        sa.CheckConstraint("max_players >= 2", name="ck_rooms_max_players"),
    )
    op.create_index("ix_rooms_code", "rooms", ["code"])

    op.create_table(
        "room_players",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("room_id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column(
            "joined_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["room_id"], ["rooms.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.UniqueConstraint("room_id", "user_id", name="uq_room_players_room_user"),
    )
    op.create_index("ix_room_players_room_id", "room_players", ["room_id"])
    op.create_index("ix_room_players_user_id", "room_players", ["user_id"])


def downgrade() -> None:
    op.drop_index("ix_room_players_user_id", table_name="room_players")
    op.drop_index("ix_room_players_room_id", table_name="room_players")
    op.drop_table("room_players")
    op.drop_index("ix_rooms_code", table_name="rooms")
    op.drop_table("rooms")
