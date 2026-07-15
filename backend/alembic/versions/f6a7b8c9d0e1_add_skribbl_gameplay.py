"""add skribbl gameplay fields

Revision ID: f6a7b8c9d0e1
Revises: e5f6a7b8c9d0
Create Date: 2026-07-15 19:10:00.000000
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "f6a7b8c9d0e1"
down_revision: Union[str, None] = "e5f6a7b8c9d0"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_constraint("ck_game_sessions_phase", "game_sessions", type_="check")
    op.create_check_constraint(
        "ck_game_sessions_phase",
        "game_sessions",
        "phase IN ('LOBBY', 'COUNTDOWN', 'WORD_SELECTION', 'ROUND_ACTIVE', "
        "'ROUND_END', 'GAME_FINISHED')",
    )

    op.add_column(
        "game_sessions",
        sa.Column("secret_word", sa.String(length=64), nullable=True),
    )
    op.add_column(
        "game_sessions",
        sa.Column("word_choices_json", sa.Text(), nullable=True),
    )
    op.add_column(
        "game_sessions",
        sa.Column("round_started_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "game_sessions",
        sa.Column("winner_user_id", sa.Uuid(), nullable=True),
    )
    op.create_foreign_key(
        "fk_game_sessions_winner_user_id_users",
        "game_sessions",
        "users",
        ["winner_user_id"],
        ["id"],
        ondelete="SET NULL",
    )

    op.add_column(
        "game_session_players",
        sa.Column(
            "score",
            sa.Integer(),
            server_default=sa.text("0"),
            nullable=False,
        ),
    )
    op.add_column(
        "game_session_players",
        sa.Column(
            "has_guessed_correctly",
            sa.Boolean(),
            server_default=sa.text("false"),
            nullable=False,
        ),
    )
    op.add_column(
        "game_session_players",
        sa.Column(
            "round_points",
            sa.Integer(),
            server_default=sa.text("0"),
            nullable=False,
        ),
    )
    op.create_check_constraint(
        "ck_game_session_players_score",
        "game_session_players",
        "score >= 0",
    )


def downgrade() -> None:
    op.drop_constraint(
        "ck_game_session_players_score", "game_session_players", type_="check"
    )
    op.drop_column("game_session_players", "round_points")
    op.drop_column("game_session_players", "has_guessed_correctly")
    op.drop_column("game_session_players", "score")

    op.drop_constraint(
        "fk_game_sessions_winner_user_id_users", "game_sessions", type_="foreignkey"
    )
    op.drop_column("game_sessions", "winner_user_id")
    op.drop_column("game_sessions", "round_started_at")
    op.drop_column("game_sessions", "word_choices_json")
    op.drop_column("game_sessions", "secret_word")

    op.drop_constraint("ck_game_sessions_phase", "game_sessions", type_="check")
    op.create_check_constraint(
        "ck_game_sessions_phase",
        "game_sessions",
        "phase IN ('LOBBY', 'COUNTDOWN', 'ROUND_ACTIVE', "
        "'ROUND_END', 'GAME_FINISHED')",
    )
