"""Deterministic weekly packs and answer matching."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

from app.services.ai_guesser_week import (
    FREE_PLAY_WORDS,
    GAMES_PER_WEEK,
    PROMPTS_PER_GAME,
    WEEKLY_GAMES,
    answers_match,
    current_week_id,
    pick_free_play_word,
    week_pack,
    week_resets_at,
    week_start_utc,
)


def test_week_id_is_iso_week_utc():
    moment = datetime(2026, 9, 8, 7, 0, tzinfo=timezone.utc)
    assert current_week_id(moment) == "2026-W37"


def test_week_resets_monday_utc():
    start = week_start_utc("2026-W37")
    assert start.weekday() == 0
    assert week_resets_at("2026-W37") - start == timedelta(weeks=1)


def test_pack_is_stable_for_a_week():
    a = week_pack("2026-W37")
    b = week_pack("2026-W37")
    assert a == b
    assert len(a) == GAMES_PER_WEEK
    for words in a.values():
        assert len(words) == PROMPTS_PER_GAME
        assert len(set(words)) == PROMPTS_PER_GAME


def test_next_week_uses_a_different_pack():
    this_week = week_pack("2026-W37")
    next_week = week_pack("2026-W38")
    assert this_week != next_week


def test_answers_match_ignores_articles_and_case():
    assert answers_match("The Hot Air Balloon", "hot air balloon")
    assert not answers_match("balloon", "hot air balloon")


def test_free_play_avoids_franchise_names():
    banned = {
        "iron man",
        "spider-man",
        "batman",
        "harry potter",
        "star wars",
        "pokemon",
        "minecraft",
        "among us",
    }
    lowered = {word.lower() for word in FREE_PLAY_WORDS}
    assert banned.isdisjoint(lowered)
    assert pick_free_play_word("lighthouse", week_id="2026-W37") != "lighthouse"


def test_weekly_games_have_stable_slugs():
    assert [game.slug for game in WEEKLY_GAMES] == [
        "sports",
        "places",
        "motion",
        "pop-culture",
        "wild-card",
    ]


def test_pop_culture_pack_is_the_franchise_five():
    from app.services.ai_guesser_week import GAME_BY_SLUG, prompts_for_game

    game = GAME_BY_SLUG["pop-culture"]
    words = set(prompts_for_game("2026-W37", game))
    assert words == {"marvel", "minecraft", "superman", "lego", "pokemon"}
