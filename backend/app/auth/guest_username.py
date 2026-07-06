import random
import secrets

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.user import User

ADJECTIVES = (
    # classic
    "Swift",
    "Bold",
    "Clever",
    "Cosmic",
    "Daring",
    "Electric",
    "Mighty",
    "Neon",
    "Pixel",
    # drawing / art
    "Sketchy",
    "Inky",
    "Smudgy",
    "Hatched",
    "Layered",
    "Outlined",
    "Wavy",
    "Scribbly",
    "Blurry",
    "Textured",
    "Shadowy",
    "Saturated",
    "Pastel",
    "Grainy",
    "Wobbly",
    "Warped",
    "Stroked",
    "Vectored",
    "Rendered",
    "Pixelated",
    # gen-z / brainrot
    "Bussin",
    "Glazed",
    "Sussy",
    "Cooked",
    "Delulu",
    "Unhinged",
    "Rizzy",
    "Goated",
    "Lowkey",
    "Highkey",
    "Sigma",
    "Based",
    "Mid",
    "SleptOn",
    "Fried",
    "Crispy",
    "Washed",
    "Bozo",
    "Gyatt",
    "Skibidi",
    "Fanum",
    "Ohio",
    "Grimacing",
    "Glazing",
    "Mindful",
    "Slay",
)

NOUNS = (
    # drawing / art
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
    "Splatter",
    "Bezier",
    "Gouache",
    "Impasto",
    "Sgraffito",
    # gen-z / brainrot
    "Rizz",
    "Slay",
    "Bussin",
    "Sigma",
    "Glazer",
    "Bozo",
    "Npc",
    "Lore",
    "Era",
    "Aura",
    "Gyatt",
    "Skibidi",
    "Fanum",
    "Yapper",
    "Pookie",
    "Bffr",
    "Delulu",
    "Situationship",
    "Understood",
    "Mewing",
    "Hawk",
    "Tuah",
    "Villain",
    "Protagonist",
    "Sidequest",
    "Looksmaxx",
    "Grindset",
    "Mogged",
    "Goon",
    "Brainrot",
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
