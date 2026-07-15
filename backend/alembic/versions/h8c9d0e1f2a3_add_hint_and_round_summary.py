"""add hint reveals and round summary persistence

Revision ID: h8c9d0e1f2a3
Revises: g7b8c9d0e1f2
Create Date: 2026-07-16 03:30:00.000000
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "h8c9d0e1f2a3"
down_revision: Union[str, None] = "g7b8c9d0e1f2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "game_sessions",
        sa.Column("hint_revealed_json", sa.Text(), nullable=True),
    )
    op.add_column(
        "game_sessions",
        sa.Column("last_round_summary_json", sa.Text(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("game_sessions", "last_round_summary_json")
    op.drop_column("game_sessions", "hint_revealed_json")
