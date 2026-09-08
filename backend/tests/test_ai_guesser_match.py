"""Weekly run clock, personal bests, and leaderboard order."""

from __future__ import annotations

import os
from datetime import timedelta
from types import SimpleNamespace
from uuid import uuid4

os.environ.setdefault("GOOGLE_CLIENT_ID", "test")
os.environ.setdefault("GOOGLE_CLIENT_SECRET", "test")
os.environ.setdefault("GOOGLE_REDIRECT_URI", "http://localhost/callback")
os.environ.setdefault("FRONTEND_URL", "http://localhost:3000")
os.environ.setdefault("SESSION_SECRET_KEY", "test-session")
os.environ.setdefault("JWT_SECRET", "test-jwt")
os.environ.setdefault("DATABASE_URL", "sqlite:///:memory:")
os.environ.setdefault("COOKIE_SECURE", "false")
os.environ.setdefault("COOKIE_SAMESITE", "lax")

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.db.database import Base
from app.models.user import User
from app.services.ai_guesser_match import (
    MatchError,
    apply_guesses,
    fail_prompt,
    free_play_unlocked,
    get_user_best,
    list_leaderboard,
    start_run,
    week_overview,
)
from app.services.ai_guesser_week import (
    MAX_CALLS_PER_PROMPT,
    PROMPT_LIMIT_MS,
    PROMPTS_PER_GAME,
    require_game,
    utcnow,
)


@pytest.fixture()
def db() -> Session:
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    SessionLocal = sessionmaker(bind=engine)
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(engine)


def _user(db: Session, name: str = "Player") -> User:
    user = User(
        provider="guest",
        provider_id=str(uuid4()),
        name=name,
        email=None,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def _guess(answer: str):
    return SimpleNamespace(answer=answer)


def test_solve_records_elapsed_not_the_cap(db, monkeypatch):
    user = _user(db)
    game = require_game(slug="sports")
    started = utcnow()
    monkeypatch.setattr("app.services.ai_guesser_match.utcnow", lambda: started)
    snap = start_run(db, user_id=user.id, game=game)
    later = started + timedelta(milliseconds=12_400)
    monkeypatch.setattr("app.services.ai_guesser_match.utcnow", lambda: later)
    next_snap = apply_guesses(
        db, user_id=user.id, run_id=snap.run_id, guesses=[_guess(snap.secret)]
    )
    assert next_snap.prompt_solved is True
    assert next_snap.last_split is not None
    assert next_snap.last_split["solved"] is True
    assert 12_000 <= next_snap.last_split["ms"] <= 13_000
    assert next_snap.prompt_index == 1


def test_timeout_records_full_prompt_and_cross(db, monkeypatch):
    user = _user(db)
    game = require_game(slug="places")
    started = utcnow()
    monkeypatch.setattr("app.services.ai_guesser_match.utcnow", lambda: started)
    snap = start_run(db, user_id=user.id, game=game)
    later = started + timedelta(milliseconds=PROMPT_LIMIT_MS + 50)
    monkeypatch.setattr("app.services.ai_guesser_match.utcnow", lambda: later)
    next_snap = fail_prompt(db, user_id=user.id, run_id=snap.run_id)
    assert next_snap.prompt_failed is True
    assert next_snap.last_split == {"ms": PROMPT_LIMIT_MS, "solved": False}


def test_early_fail_is_rejected(db):
    user = _user(db)
    snap = start_run(db, user_id=user.id, game=require_game(slug="motion"))
    with pytest.raises(MatchError) as exc:
        fail_prompt(db, user_id=user.id, run_id=snap.run_id)
    assert exc.value.status_code == 400


def test_call_cap_does_not_allow_an_early_fail(db):
    user = _user(db)
    snap = start_run(db, user_id=user.id, game=require_game(slug="motion"))
    for _ in range(MAX_CALLS_PER_PROMPT):
        snap = apply_guesses(
            db, user_id=user.id, run_id=snap.run_id, guesses=[_guess("nope")]
        )
    with pytest.raises(MatchError) as exc:
        fail_prompt(db, user_id=user.id, run_id=snap.run_id)
    assert exc.value.status_code == 400


def test_call_cap_stops_looking_but_leaves_the_clock(db):
    user = _user(db)
    snap = start_run(db, user_id=user.id, game=require_game(slug="pop-culture"))
    for _ in range(MAX_CALLS_PER_PROMPT):
        snap = apply_guesses(
            db, user_id=user.id, run_id=snap.run_id, guesses=[_guess("nope")]
        )
        assert snap.prompt_failed is False
        assert snap.prompt_index == 0
    assert snap.calls_left == 0
    extra = apply_guesses(
        db, user_id=user.id, run_id=snap.run_id, guesses=[_guess("nope")]
    )
    assert extra.prompt_failed is False
    assert extra.calls_used == MAX_CALLS_PER_PROMPT
    assert extra.prompt_index == 0


def _finish_run(db, user, game, *, solve_ms: int, monkeypatch):
    started = utcnow()
    monkeypatch.setattr("app.services.ai_guesser_match.utcnow", lambda: started)
    snap = start_run(db, user_id=user.id, game=game)
    clock = started
    for _ in range(PROMPTS_PER_GAME):
        clock = clock + timedelta(milliseconds=solve_ms)
        monkeypatch.setattr("app.services.ai_guesser_match.utcnow", lambda c=clock: c)
        snap = apply_guesses(
            db, user_id=user.id, run_id=snap.run_id, guesses=[_guess(snap.secret)]
        )
    assert snap.status == "finished"
    return snap


def test_personal_best_keeps_faster_total(db, monkeypatch):
    user = _user(db)
    game = require_game(slug="wild-card")
    first = _finish_run(db, user, game, solve_ms=20_000, monkeypatch=monkeypatch)
    assert first.is_personal_best is True
    second = _finish_run(db, user, game, solve_ms=30_000, monkeypatch=monkeypatch)
    assert second.is_personal_best is False
    best, rank, splits = get_user_best(db, game=game, user_id=user.id)
    assert best == first.total_ms
    assert rank == 1
    assert splits is not None
    assert all(item["solved"] for item in splits)


def test_leaderboard_sorts_by_total_only(db, monkeypatch):
    game = require_game(slug="sports")
    slow = _user(db, "Slow")
    fast = _user(db, "Fast")
    _finish_run(db, slow, game, solve_ms=25_000, monkeypatch=monkeypatch)
    _finish_run(db, fast, game, solve_ms=11_000, monkeypatch=monkeypatch)
    ranked, total = list_leaderboard(db, game=game)
    assert total == 2
    assert ranked[0].score.user.name == "Fast"
    assert ranked[0].rank == 1
    assert ranked[1].score.user.name == "Slow"
    assert "gemini" not in ranked[0].score.user.name.lower()


def test_stale_prompt_guess_is_ignored(db, monkeypatch):
    user = _user(db)
    game = require_game(slug="sports")
    started = utcnow()
    monkeypatch.setattr("app.services.ai_guesser_match.utcnow", lambda: started)
    snap = start_run(db, user_id=user.id, game=game)
    later = started + timedelta(milliseconds=5_000)
    monkeypatch.setattr("app.services.ai_guesser_match.utcnow", lambda: later)
    next_snap = apply_guesses(
        db,
        user_id=user.id,
        run_id=snap.run_id,
        guesses=[_guess(snap.secret)],
        prompt_index=0,
    )
    assert next_snap.prompt_index == 1
    # Late look for the previous drawing must not consume the next prompt.
    stale = apply_guesses(
        db,
        user_id=user.id,
        run_id=snap.run_id,
        guesses=[_guess("whatever")],
        prompt_index=0,
    )
    assert stale.prompt_index == 1
    assert stale.calls_used == 0
    assert stale.prompt_solved is False


def test_finished_run_accepts_late_guess_without_409(db, monkeypatch):
    user = _user(db)
    game = require_game(slug="places")
    finished = _finish_run(db, user, game, solve_ms=10_000, monkeypatch=monkeypatch)
    late = apply_guesses(
        db,
        user_id=user.id,
        run_id=finished.run_id,
        guesses=[_guess("dog")],
        prompt_index=4,
    )
    assert late.status == "finished"
    assert late.total_ms == finished.total_ms
    user = _user(db)
    assert free_play_unlocked(db, user_id=user.id) is False
    for game in (
        require_game(slug="sports"),
        require_game(slug="places"),
        require_game(slug="motion"),
        require_game(slug="pop-culture"),
        require_game(slug="wild-card"),
    ):
        _finish_run(db, user, game, solve_ms=15_000, monkeypatch=monkeypatch)
    assert free_play_unlocked(db, user_id=user.id) is True
    overview = week_overview(db, user_id=user.id)
    assert overview.free_play_unlocked is True
    assert overview.finished_count == 5
