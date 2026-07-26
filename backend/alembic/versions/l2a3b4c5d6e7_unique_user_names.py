"""enforce unique user display names for profile URLs

Revision ID: l2a3b4c5d6e7
Revises: k1f2a3b4c5d6
Create Date: 2026-07-27 01:00:00.000000
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "l2a3b4c5d6e7"
down_revision: Union[str, None] = "k1f2a3b4c5d6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    rows = conn.execute(
        sa.text("SELECT id, name FROM users ORDER BY created_at ASC, id ASC")
    ).fetchall()

    seen: dict[str, int] = {}
    for user_id, name in rows:
        base = (name or "").strip() or "Player"
        key = base.casefold()
        count = seen.get(key, 0) + 1
        seen[key] = count
        if count == 1:
            continue
        # Keep the earliest account on the original name; later dupes get a suffix.
        candidate = f"{base}{count}"
        while candidate.casefold() in seen:
            count += 1
            seen[key] = count
            candidate = f"{base}{count}"
        seen[candidate.casefold()] = 1
        conn.execute(
            sa.text("UPDATE users SET name = :name WHERE id = :id"),
            {"name": candidate[:50], "id": user_id},
        )

    op.execute(
        "CREATE UNIQUE INDEX IF NOT EXISTS uq_users_name_lower ON users (lower(name))"
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS uq_users_name_lower")
