"""add weekly AI guesser runs and scores

Revision ID: q7f8a9b0c1d2
Revises: p6e7f8a9b0c1
Create Date: 2026-09-08 02:20:00.000000
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "q7f8a9b0c1d2"
down_revision: Union[str, None] = "p6e7f8a9b0c1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    json_type = (
        postgresql.JSONB(astext_type=sa.Text())
        if bind.dialect.name == "postgresql"
        else sa.JSON()
    )

    op.create_table(
        "ai_guesser_runs",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("week_id", sa.String(length=16), nullable=False),
        sa.Column("game_index", sa.Integer(), nullable=False),
        sa.Column("prompt_index", sa.Integer(), nullable=False),
        sa.Column("prompt_started_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("calls_used", sa.Integer(), nullable=False),
        sa.Column("splits", json_type, nullable=False),
        sa.Column("status", sa.String(length=16), nullable=False),
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
            "game_index >= 1 AND game_index <= 5",
            name="ck_ai_guesser_runs_game_index",
        ),
        sa.CheckConstraint(
            "status IN ('open', 'finished', 'abandoned')",
            name="ck_ai_guesser_runs_status",
        ),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_ai_guesser_runs_user_id", "ai_guesser_runs", ["user_id"]
    )
    op.create_index(
        "ix_ai_guesser_runs_week_id", "ai_guesser_runs", ["week_id"]
    )
    op.create_index(
        "ix_ai_guesser_runs_user_status",
        "ai_guesser_runs",
        ["user_id", "status"],
    )

    op.create_table(
        "ai_guesser_scores",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("week_id", sa.String(length=16), nullable=False),
        sa.Column("game_index", sa.Integer(), nullable=False),
        sa.Column("total_ms", sa.Integer(), nullable=False),
        sa.Column("splits", json_type, nullable=False),
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
            "game_index >= 1 AND game_index <= 5",
            name="ck_ai_guesser_scores_game_index",
        ),
        sa.CheckConstraint("total_ms > 0", name="ck_ai_guesser_scores_total_ms"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "week_id",
            "game_index",
            "user_id",
            name="uq_ai_guesser_scores_week_game_user",
        ),
    )
    op.create_index(
        "ix_ai_guesser_scores_user_id", "ai_guesser_scores", ["user_id"]
    )
    op.create_index(
        "ix_ai_guesser_scores_week_id", "ai_guesser_scores", ["week_id"]
    )
    op.create_index(
        "ix_ai_guesser_scores_week_game_total",
        "ai_guesser_scores",
        ["week_id", "game_index", "total_ms"],
    )


def downgrade() -> None:
    op.drop_index(
        "ix_ai_guesser_scores_week_game_total", table_name="ai_guesser_scores"
    )
    op.drop_index("ix_ai_guesser_scores_week_id", table_name="ai_guesser_scores")
    op.drop_index("ix_ai_guesser_scores_user_id", table_name="ai_guesser_scores")
    op.drop_table("ai_guesser_scores")
    op.drop_index(
        "ix_ai_guesser_runs_user_status", table_name="ai_guesser_runs"
    )
    op.drop_index("ix_ai_guesser_runs_week_id", table_name="ai_guesser_runs")
    op.drop_index("ix_ai_guesser_runs_user_id", table_name="ai_guesser_runs")
    op.drop_table("ai_guesser_runs")
