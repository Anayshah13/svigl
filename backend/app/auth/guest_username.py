import random
import secrets

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.user import User

ADJECTIVES = (
    "Swift",
    "Bold",
    "Clever",
    "Cosmic",
    "Daring",
    "Electric",
    "Fierce",
    "Golden",
    "Happy",
    "Jolly",
    "Lucky",
    "Mighty",
    "Neon",
    "Pixel",
    "Quick",
    "Radiant",
    "Silent",
    "Turbo",
    "Vivid",
    "Wild",
)

NOUNS = (
    "Artist",
    "Brush",
    "Canvas",
    "Doodle",
    "Drawer",
    "Easel",
    "Glyph",
    "Inkling",
    "Painter",
    "Palette",
    "Pencil",
    "Pixel",
    "Scribble",
    "Sketch",
    "Stroke",
    "Vector",
    "Wizard",
    "Canvas",
    "Mural",
    "Sketchpad",
)

MAX_USERNAME_ATTEMPTS = 50


def generate_guest_username(db: Session) -> str:
    for _ in range(MAX_USERNAME_ATTEMPTS):
        adjective = secrets.choice(ADJECTIVES).capitalize()
        noun = secrets.choice(NOUNS).capitalize()
        number = random.randint(100, 999)
        username = f"{adjective}{noun}{number}"
        exists = db.scalar(select(User.id).where(User.name == username).limit(1))
        if exists is None:
            return username

    raise RuntimeError("Could not generate a unique guest username.")
