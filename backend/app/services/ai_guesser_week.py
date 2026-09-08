"""Weekly prompt packs and Free Play vocabulary for AI Guesser.

The five themed games are stable identities. Their five secrets rotate every
ISO week (Monday 00:00 UTC) from a deterministic shuffle so every player sees
the same pack. Free Play stays franchise-free; Pop Culture is the exception.

Words must be easy to sketch in a few strokes and named the way a vision
model typically labels them. Skip rare architecture, jobs, and subtypes
(pagoda → temple, steam locomotive → train).
"""

from __future__ import annotations

import hashlib
import random
import re
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone

PROMPTS_PER_GAME = 5
GAMES_PER_WEEK = 5
PROMPT_LIMIT_MS = 70_000
MAX_CALLS_PER_PROMPT = 12

_LEADING_ARTICLE = re.compile(r"^(a|an|the)\s+")
_NON_ALNUM = re.compile(r"[^a-z0-9]+")


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def current_week_id(now: datetime | None = None) -> str:
    moment = now or utcnow()
    if moment.tzinfo is None:
        moment = moment.replace(tzinfo=timezone.utc)
    iso = moment.astimezone(timezone.utc).isocalendar()
    return f"{iso.year}-W{iso.week:02d}"


def parse_week_id(week_id: str) -> tuple[int, int]:
    year_s, week_s = week_id.split("-W", 1)
    return int(year_s), int(week_s)


def week_start_utc(week_id: str) -> datetime:
    year, week = parse_week_id(week_id)
    return datetime.fromisocalendar(year, week, 1).replace(tzinfo=timezone.utc)


def week_resets_at(week_id: str) -> datetime:
    return week_start_utc(week_id) + timedelta(weeks=1)


def normalize_answer(value: str) -> str:
    cleaned = value.lower().replace("&", " and ")
    cleaned = _NON_ALNUM.sub(" ", cleaned).strip()
    return re.sub(r"\s+", " ", cleaned)


def answers_match(guess: str, secret: str) -> bool:
    a = _LEADING_ARTICLE.sub("", normalize_answer(guess))
    b = _LEADING_ARTICLE.sub("", normalize_answer(secret))
    return bool(a) and a == b


SPORTS: tuple[str, ...] = (
    "soccer ball",
    "basketball",
    "tennis racket",
    "baseball bat",
    "hockey stick",
    "golf club",
    "bowling pin",
    "skateboard",
    "surfboard",
    "boxing gloves",
    "trophy",
    "frisbee",
    "volleyball",
    "snowboard",
    "tennis ball",
    "dumbbell",
    "whistle",
    "baseball",
    "helmet",
    "bowling ball",
    "football",
    "basketball hoop",
)

PLACES: tuple[str, ...] = (
    "lighthouse",
    "windmill",
    "igloo",
    "fountain",
    "clock tower",
    "volcano",
    "cave",
    "island",
    "house",
    "castle",
    "pyramid",
    "tent",
    "bridge",
    "mountain",
    "beach",
    "barn",
    "treehouse",
    "waterfall",
    "skyscraper",
    "school",
)

MOTION: tuple[str, ...] = (
    "hot air balloon",
    "submarine",
    "helicopter",
    "sailboat",
    "unicycle",
    "parachute",
    "roller coaster",
    "ferris wheel",
    "scooter",
    "kayak",
    "sleigh",
    "tractor",
    "ambulance",
    "fire truck",
    "car",
    "bus",
    "truck",
    "train",
    "airplane",
    "rocket",
    "bicycle",
    "motorcycle",
    "boat",
    "school bus",
)

POP_CULTURE: tuple[str, ...] = (
    "marvel",
    "minecraft",
    "superman",
    "lego",
    "pokemon",
)

WILD_CARD: tuple[str, ...] = (
    "hourglass",
    "binoculars",
    "telescope",
    "compass",
    "megaphone",
    "scarecrow",
    "treasure chest",
    "hammock",
    "astronaut",
    "snow globe",
    "anvil",
    "boomerang",
    "lantern",
    "umbrella",
    "backpack",
    "trophy",
    "crown",
    "key",
    "glasses",
    "camera",
    "guitar",
    "robot",
    "ghost",
    "snowman",
    "cactus",
    "mushroom",
    "rainbow",
    "scissors",
    "lamp",
    "clock",
)

FREE_PLAY_WORDS: tuple[str, ...] = (
    "lighthouse",
    "binoculars",
    "scarecrow",
    "hourglass",
    "telescope",
    "windmill",
    "hammock",
    "fountain",
    "roller coaster",
    "ferris wheel",
    "campfire",
    "parachute",
    "hot air balloon",
    "treasure chest",
    "tornado",
    "satellite",
    "jellyfish",
    "peacock",
    "octopus",
    "seahorse",
    "porcupine",
    "clock tower",
    "snow globe",
    "boomerang",
    "lantern",
    "megaphone",
    "unicycle",
    "kayak",
    "waterfall",
    "honeycomb",
    "igloo",
    "castle",
    "pyramid",
    "cactus",
    "mushroom",
    "rainbow",
    "snowman",
    "robot",
    "dinosaur",
    "penguin",
    "elephant",
    "giraffe",
    "butterfly",
    "pizza",
    "guitar",
    "umbrella",
    "backpack",
    "ghost",
    "rocket",
    "treehouse",
    "sailboat",
    "fire truck",
    "bicycle",
    "submarine",
    "helicopter",
    "house",
    "tent",
    "volcano",
    "island",
    "apple",
)


@dataclass(frozen=True)
class WeekGame:
    index: int
    slug: str
    title: str
    description: str
    words: tuple[str, ...]


WEEKLY_GAMES: tuple[WeekGame, ...] = (
    WeekGame(
        1,
        "sports",
        "Sports",
        "Gear, games, and stadium moments with a clear silhouette.",
        SPORTS,
    ),
    WeekGame(
        2,
        "places",
        "Places",
        "Buildings and landscapes you can picture, not trivia spots.",
        PLACES,
    ),
    WeekGame(
        3,
        "motion",
        "Motion",
        "Things that go. Vehicles and rides with a clear silhouette.",
        MOTION,
    ),
    WeekGame(
        4,
        "pop-culture",
        "Pop Culture",
        "Big franchises everyone knows. Draw the vibe, not a logo.",
        POP_CULTURE,
    ),
    WeekGame(
        5,
        "wild-card",
        "Wild Card",
        "Objects and scenes with a twist. No franchises.",
        WILD_CARD,
    ),
)

GAME_BY_SLUG = {game.slug: game for game in WEEKLY_GAMES}
GAME_BY_INDEX = {game.index: game for game in WEEKLY_GAMES}


def _rng(*parts: str) -> random.Random:
    seed = hashlib.sha256(":".join(parts).encode("utf-8")).hexdigest()
    return random.Random(int(seed[:16], 16))


def prompts_for_game(week_id: str, game: WeekGame) -> list[str]:
    pool = list(game.words)
    rng = _rng(week_id, game.slug)
    rng.shuffle(pool)
    return pool[:PROMPTS_PER_GAME]


def week_pack(week_id: str) -> dict[int, list[str]]:
    return {game.index: prompts_for_game(week_id, game) for game in WEEKLY_GAMES}


def require_game(*, slug: str | None = None, index: int | None = None) -> WeekGame:
    if slug is not None:
        game = GAME_BY_SLUG.get(slug.strip().lower())
        if game is None:
            raise KeyError(slug)
        return game
    if index is not None:
        game = GAME_BY_INDEX.get(index)
        if game is None:
            raise KeyError(index)
        return game
    raise KeyError("game")


def pick_free_play_word(exclude: str | None = None, *, week_id: str | None = None) -> str:
    pool = [word for word in FREE_PLAY_WORDS if word != exclude]
    if not pool:
        pool = list(FREE_PLAY_WORDS)
    rng = _rng(week_id or current_week_id(), "free-play", exclude or "")
    return rng.choice(pool)
