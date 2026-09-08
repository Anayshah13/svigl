"""wipe AI guesser scores and runs for a clean weekly board

Revision ID: r8a9b0c1d2e3
Revises: q7f8a9b0c1d2
Create Date: 2026-09-08 14:30:00.000000
"""

from typing import Sequence, Union

from alembic import op

revision: str = "r8a9b0c1d2e3"
down_revision: Union[str, None] = "q7f8a9b0c1d2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("DELETE FROM ai_guesser_scores")
    op.execute("DELETE FROM ai_guesser_runs")


def downgrade() -> None:
    # Deleted times cannot be restored.
    pass
