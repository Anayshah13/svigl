"""add lab_scores table for global Labs leaderboards

Revision ID: n4c5d6e7f8a9
Revises: m3b4c5d6e7f8
Create Date: 2026-07-29 03:30:00.000000
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "n4c5d6e7f8a9"
down_revision: Union[str, None] = "m3b4c5d6e7f8"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "lab_scores",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("lab_slug", sa.String(length=64), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("score", sa.Float(), nullable=False),
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
            "lab_slug IN ("
            "'perfect-circle', 'perfect-square', 'perfect-triangle', 'infinity-loop'"
            ")",
            name="ck_lab_scores_lab_slug",
        ),
        sa.CheckConstraint(
            "score > 0 AND score <= 100",
            name="ck_lab_scores_score_range",
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("lab_slug", "user_id", name="uq_lab_scores_lab_user"),
    )
    op.create_index("ix_lab_scores_lab_slug", "lab_scores", ["lab_slug"], unique=False)
    op.create_index("ix_lab_scores_user_id", "lab_scores", ["user_id"], unique=False)
    op.create_index(
        "ix_lab_scores_lab_score",
        "lab_scores",
        ["lab_slug", "score"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_lab_scores_lab_score", table_name="lab_scores")
    op.drop_index("ix_lab_scores_user_id", table_name="lab_scores")
    op.drop_index("ix_lab_scores_lab_slug", table_name="lab_scores")
    op.drop_table("lab_scores")
