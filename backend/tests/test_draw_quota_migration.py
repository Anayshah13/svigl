"""Verify j0e1f2a3b4c5 backfill SQL for in-flight draw quotas.

Repo has no Alembic integration-test harness; this exercises the same portable
UPDATE statements the migration runs after the new columns exist.
"""

from __future__ import annotations

import uuid

import pytest
from sqlalchemy import create_engine, text
from sqlalchemy.engine import Engine


@pytest.fixture()
def engine() -> Engine:
    eng = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
    )
    with eng.begin() as conn:
        conn.execute(
            text(
                """
                CREATE TABLE game_sessions (
                    id CHAR(32) PRIMARY KEY,
                    phase VARCHAR(24) NOT NULL,
                    current_turn INTEGER NOT NULL,
                    total_rounds INTEGER NOT NULL,
                    current_round INTEGER NOT NULL DEFAULT 0
                )
                """
            )
        )
        conn.execute(
            text(
                """
                CREATE TABLE game_session_players (
                    id CHAR(32) PRIMARY KEY,
                    session_id CHAR(32) NOT NULL,
                    rotation_index INTEGER NOT NULL,
                    draws_done INTEGER NOT NULL DEFAULT 0,
                    draw_target INTEGER NOT NULL DEFAULT 0
                )
                """
            )
        )
    return eng


def _run_backfill(engine: Engine) -> None:
    """Mirror alembic revision j0e1f2a3b4c5 data steps."""
    with engine.begin() as conn:
        conn.execute(
            text(
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
        )
        conn.execute(
            text(
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
        )


def test_draw_target_backfill_skips_lobby_and_fills_inflight(engine: Engine) -> None:
    lobby_id = uuid.uuid4().hex
    active_id = uuid.uuid4().hex
    finished_id = uuid.uuid4().hex

    with engine.begin() as conn:
        conn.execute(
            text(
                """
                INSERT INTO game_sessions
                    (id, phase, current_turn, total_rounds, current_round)
                VALUES
                    (:lobby, 'LOBBY', 0, 3, 0),
                    (:active, 'ROUND_ACTIVE', 4, 3, 0),
                    (:finished, 'GAME_FINISHED', 6, 2, 0)
                """
            ),
            {"lobby": lobby_id, "active": active_id, "finished": finished_id},
        )
        # Lobby leftover roster rows (post-game) must stay at target 0.
        conn.execute(
            text(
                """
                INSERT INTO game_session_players
                    (id, session_id, rotation_index, draws_done, draw_target)
                VALUES
                    (:a, :lobby, 0, 0, 0),
                    (:b, :active, 0, 0, 0),
                    (:c, :active, 1, 0, 0),
                    (:d, :finished, 0, 0, 0)
                """
            ),
            {
                "a": uuid.uuid4().hex,
                "b": uuid.uuid4().hex,
                "c": uuid.uuid4().hex,
                "d": uuid.uuid4().hex,
                "lobby": lobby_id,
                "active": active_id,
                "finished": finished_id,
            },
        )

    _run_backfill(engine)

    with engine.connect() as conn:
        lobby_targets = conn.execute(
            text(
                "SELECT draw_target FROM game_session_players WHERE session_id = :id"
            ),
            {"id": lobby_id},
        ).scalars().all()
        assert lobby_targets == [0]

        active_targets = conn.execute(
            text(
                "SELECT draw_target FROM game_session_players "
                "WHERE session_id = :id ORDER BY rotation_index"
            ),
            {"id": active_id},
        ).scalars().all()
        assert active_targets == [3, 3]

        finished_targets = conn.execute(
            text(
                "SELECT draw_target FROM game_session_players WHERE session_id = :id"
            ),
            {"id": finished_id},
        ).scalars().all()
        assert finished_targets == [2]

        # draws_done stays at server default (not reconstructed).
        done = conn.execute(
            text("SELECT DISTINCT draws_done FROM game_session_players")
        ).scalars().all()
        assert done == [0]

        rounds = {
            row[0]: row[1]
            for row in conn.execute(
                text("SELECT id, current_round FROM game_sessions")
            )
        }
        assert rounds[lobby_id] == 0
        # current_turn=4, roster=2 → 4//2+1 = 3, clamped to total_rounds=3
        assert rounds[active_id] == 3
        assert rounds[finished_id] == 2
