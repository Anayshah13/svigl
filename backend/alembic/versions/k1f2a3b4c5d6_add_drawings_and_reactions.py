"""add drawings, reactions, and user dislikes_received

Revision ID: k1f2a3b4c5d6
Revises: j0e1f2a3b4c5
Create Date: 2026-07-26 17:00:00.000000
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "k1f2a3b4c5d6"
down_revision: Union[str, None] = "j0e1f2a3b4c5"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column(
            "dislikes_received",
            sa.Integer(),
            server_default="0",
            nullable=False,
        ),
    )

    op.create_table(
        "drawings",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("author_id", sa.Uuid(), nullable=False),
        sa.Column("room_id", sa.Uuid(), nullable=True),
        sa.Column("session_id", sa.Uuid(), nullable=False),
        sa.Column("turn_number", sa.Integer(), nullable=False),
        sa.Column("word", sa.String(length=64), nullable=False),
        sa.Column("document", sa.JSON(), nullable=True),
        sa.Column(
            "status",
            sa.String(length=16),
            server_default="in_progress",
            nullable=False,
        ),
        sa.Column("likes_count", sa.Integer(), server_default="0", nullable=False),
        sa.Column("dislikes_count", sa.Integer(), server_default="0", nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("published_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.CheckConstraint(
            "status IN ('in_progress', 'published', 'abandoned')",
            name="ck_drawings_status",
        ),
        sa.CheckConstraint("likes_count >= 0", name="ck_drawings_likes_count"),
        sa.CheckConstraint("dislikes_count >= 0", name="ck_drawings_dislikes_count"),
        sa.ForeignKeyConstraint(["author_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["room_id"], ["rooms.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("session_id", "turn_number", name="uq_drawings_session_turn"),
    )
    op.create_index("ix_drawings_author_id", "drawings", ["author_id"])
    op.create_index("ix_drawings_room_id", "drawings", ["room_id"])
    op.create_index("ix_drawings_session_id", "drawings", ["session_id"])
    op.create_index("ix_drawings_status", "drawings", ["status"])
    op.create_index("ix_drawings_published_at", "drawings", ["published_at"])
    # Trending / top-voted gallery queries.
    op.create_index(
        "ix_drawings_published_likes",
        "drawings",
        ["status", "likes_count", "published_at"],
    )

    op.create_table(
        "drawing_reactions",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("drawing_id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("value", sa.String(length=16), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.CheckConstraint(
            "value IN ('like', 'dislike')",
            name="ck_drawing_reactions_value",
        ),
        sa.ForeignKeyConstraint(["drawing_id"], ["drawings.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "drawing_id",
            "user_id",
            name="uq_drawing_reactions_drawing_user",
        ),
    )
    op.create_index(
        "ix_drawing_reactions_drawing_id", "drawing_reactions", ["drawing_id"]
    )
    op.create_index("ix_drawing_reactions_user_id", "drawing_reactions", ["user_id"])

    op.add_column(
        "game_sessions",
        sa.Column("current_drawing_id", sa.Uuid(), nullable=True),
    )
    op.create_foreign_key(
        "fk_game_sessions_current_drawing_id",
        "game_sessions",
        "drawings",
        ["current_drawing_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_index(
        "ix_game_sessions_current_drawing_id",
        "game_sessions",
        ["current_drawing_id"],
    )


def downgrade() -> None:
    op.drop_index("ix_game_sessions_current_drawing_id", table_name="game_sessions")
    op.drop_constraint(
        "fk_game_sessions_current_drawing_id",
        "game_sessions",
        type_="foreignkey",
    )
    op.drop_column("game_sessions", "current_drawing_id")

    op.drop_index("ix_drawing_reactions_user_id", table_name="drawing_reactions")
    op.drop_index("ix_drawing_reactions_drawing_id", table_name="drawing_reactions")
    op.drop_table("drawing_reactions")

    op.drop_index("ix_drawings_published_likes", table_name="drawings")
    op.drop_index("ix_drawings_published_at", table_name="drawings")
    op.drop_index("ix_drawings_status", table_name="drawings")
    op.drop_index("ix_drawings_session_id", table_name="drawings")
    op.drop_index("ix_drawings_room_id", table_name="drawings")
    op.drop_index("ix_drawings_author_id", table_name="drawings")
    op.drop_table("drawings")

    op.drop_column("users", "dislikes_received")
