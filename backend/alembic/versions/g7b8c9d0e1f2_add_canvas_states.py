"""add canvas states

Revision ID: g7b8c9d0e1f2
Revises: f6a7b8c9d0e1
Create Date: 2026-07-15 19:20:00.000000
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "g7b8c9d0e1f2"
down_revision: Union[str, None] = "f6a7b8c9d0e1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "canvas_states",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("session_id", sa.Uuid(), nullable=False),
        sa.Column("room_id", sa.Uuid(), nullable=False),
        sa.Column("current_turn", sa.Integer(), nullable=False),
        sa.Column("shapes", sa.JSON(), nullable=False),
        sa.Column("undo_stack", sa.JSON(), nullable=False),
        sa.Column("redo_stack", sa.JSON(), nullable=False),
        sa.Column("op_seq", sa.Integer(), nullable=False),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["room_id"], ["rooms.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(
            ["session_id"], ["game_sessions.id"], ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("session_id", name="uq_canvas_states_session_id"),
    )
    op.create_index(
        op.f("ix_canvas_states_session_id"),
        "canvas_states",
        ["session_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_canvas_states_room_id"),
        "canvas_states",
        ["room_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_canvas_states_room_id"), table_name="canvas_states")
    op.drop_index(op.f("ix_canvas_states_session_id"), table_name="canvas_states")
    op.drop_table("canvas_states")
