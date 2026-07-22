"""add current_round and per-player draw quotas

Revision ID: j0e1f2a3b4c5
Revises: i9d0e1f2a3b4
Create Date: 2026-07-23 02:30:00.000000

Data notes
----------
``draw_target`` is backfilled from ``game_sessions.total_rounds`` for every
non-LOBBY session player so in-flight games do not keep target=0 (which would
end the match immediately under quota checks). LOBBY rows keep 0.

``draws_done`` is intentionally left at 0. Reconstructing per-seat progress
from legacy ``current_turn`` + rotation is not portable/safe: the previous
engine rebased ``current_turn`` when late joiners were admitted at full-round
boundaries and skipped inactive seats, so a simple ``turn % roster`` formula
mis-credits those sessions. Target backfill alone keeps games playable
(possibly slightly longer); wrong ``draws_done`` could skip seats or finish
early.

``current_round`` is derived from legacy ``current_turn // roster_size + 1``
(clamped) so UI / late-join remaining-round math stay coherent after upgrade.
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "j0e1f2a3b4c5"
down_revision: Union[str, None] = "i9d0e1f2a3b4"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "game_sessions",
        sa.Column("current_round", sa.Integer(), server_default="0", nullable=False),
    )
    op.create_check_constraint(
        "ck_game_sessions_current_round",
        "game_sessions",
        "current_round >= 0",
    )

    op.add_column(
        "game_session_players",
        sa.Column("draws_done", sa.Integer(), server_default="0", nullable=False),
    )
    op.add_column(
        "game_session_players",
        sa.Column("draw_target", sa.Integer(), server_default="0", nullable=False),
    )
    op.create_check_constraint(
        "ck_game_session_players_draws_done",
        "game_session_players",
        "draws_done >= 0",
    )
    op.create_check_constraint(
        "ck_game_session_players_draw_target",
        "game_session_players",
        "draw_target >= 0",
    )

    # In-flight / non-lobby: each frozen player owed one draw per configured round.
    # Portable correlated UPDATE (SQLite + PostgreSQL). LOBBY keeps default 0.
    op.execute(
        """
        UPDATE game_session_players
        SET draw_target = (
            SELECT game_sessions.total_rounds
            FROM game_sessions
            WHERE game_sessions.id = game_session_players.session_id
        )
        WHERE session_id IN (
            SELECT id FROM game_sessions WHERE phase <> 'LOBBY'
        )
        """
    )

    # Approximate displayed round from the legacy turn cursor.
    # roster_size = 0 → treat as round 1 for active phases (avoid div-by-zero).
    op.execute(
        """
        UPDATE game_sessions
        SET current_round = CASE
            WHEN phase = 'LOBBY' THEN 0
            WHEN phase = 'GAME_FINISHED' THEN total_rounds
            WHEN (
                SELECT COUNT(*)
                FROM game_session_players
                WHERE game_session_players.session_id = game_sessions.id
            ) = 0 THEN 1
            WHEN (
                (current_turn / (
                    SELECT COUNT(*)
                    FROM game_session_players
                    WHERE game_session_players.session_id = game_sessions.id
                )) + 1
            ) < total_rounds THEN (
                (current_turn / (
                    SELECT COUNT(*)
                    FROM game_session_players
                    WHERE game_session_players.session_id = game_sessions.id
                )) + 1
            )
            ELSE total_rounds
        END
        """
    )

    # Final server defaults remain 0 on the new columns (lobby / ORM-omitted
    # inserts). start_game and admit paths set explicit quotas in app code.


def downgrade() -> None:
    op.drop_constraint(
        "ck_game_session_players_draw_target",
        "game_session_players",
        type_="check",
    )
    op.drop_constraint(
        "ck_game_session_players_draws_done",
        "game_session_players",
        type_="check",
    )
    op.drop_column("game_session_players", "draw_target")
    op.drop_column("game_session_players", "draws_done")

    op.drop_constraint(
        "ck_game_sessions_current_round",
        "game_sessions",
        type_="check",
    )
    op.drop_column("game_sessions", "current_round")
