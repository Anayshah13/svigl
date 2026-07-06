"""refactor_user_identity_providers

Revision ID: a1b2c3d4e5f6
Revises: cfcded5c7ea8
Create Date: 2026-07-06 20:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "a1b2c3d4e5f6"
down_revision: Union[str, Sequence[str], None] = "cfcded5c7ea8"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("provider", sa.String(length=32), nullable=True))
    op.add_column("users", sa.Column("provider_id", sa.String(length=255), nullable=True))

    op.execute(
        """
        UPDATE users
        SET provider = 'google', provider_id = google_id
        WHERE google_id IS NOT NULL
        """
    )

    op.alter_column("users", "provider", nullable=False)
    op.alter_column("users", "provider_id", nullable=False)
    op.alter_column("users", "email", existing_type=sa.String(length=320), nullable=True)

    op.drop_index(op.f("ix_users_google_id"), table_name="users")
    op.drop_column("users", "google_id")

    op.create_index("ix_users_provider_provider_id", "users", ["provider", "provider_id"], unique=True)


def downgrade() -> None:
    op.drop_index("ix_users_provider_provider_id", table_name="users")

    op.add_column("users", sa.Column("google_id", sa.String(length=255), nullable=True))
    op.execute(
        """
        UPDATE users
        SET google_id = provider_id
        WHERE provider = 'google'
        """
    )

    op.drop_column("users", "provider_id")
    op.drop_column("users", "provider")

    op.create_index(op.f("ix_users_google_id"), "users", ["google_id"], unique=True)
    op.alter_column("users", "email", existing_type=sa.String(length=320), nullable=False)
