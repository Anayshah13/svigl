"""raise default room max_players to 12

Revision ID: o5d6e7f8a9b0
Revises: n4c5d6e7f8a9
Create Date: 2026-07-30 01:54:00.000000
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "o5d6e7f8a9b0"
down_revision: Union[str, None] = "n4c5d6e7f8a9"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column(
        "rooms",
        "max_players",
        existing_type=sa.Integer(),
        server_default="12",
        existing_nullable=False,
    )
    op.execute(sa.text("UPDATE rooms SET max_players = 12 WHERE max_players = 8"))


def downgrade() -> None:
    op.execute(sa.text("UPDATE rooms SET max_players = 8 WHERE max_players = 12"))
    op.alter_column(
        "rooms",
        "max_players",
        existing_type=sa.Integer(),
        server_default="8",
        existing_nullable=False,
    )
