"""One-shot wipe of AI Guesser leaderboard scores and in-progress runs.

Leaves users and other game data untouched. Use after rotating weekly
prompts so old times do not sit on the new word pack.

Usage (from repo root, with docker compose up):

    docker compose exec backend python -m scripts.reset_ai_guesser

Or against a local venv with DATABASE_URL / POSTGRES_* set:

    python -m scripts.reset_ai_guesser
"""

from __future__ import annotations

import sys
from pathlib import Path

_BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(_BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(_BACKEND_ROOT))

from sqlalchemy import text

from app.db.session import SessionLocal


def reset_ai_guesser() -> dict[str, int]:
    db = SessionLocal()
    try:
        scores = db.execute(text("DELETE FROM ai_guesser_scores")).rowcount
        runs = db.execute(text("DELETE FROM ai_guesser_runs")).rowcount
        db.commit()
        return {
            "ai_guesser_scores_deleted": scores or 0,
            "ai_guesser_runs_deleted": runs or 0,
        }
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def main() -> None:
    counts = reset_ai_guesser()
    print("AI Guesser leaderboard reset complete:")
    for key, value in counts.items():
        print(f"  {key}: {value}")


if __name__ == "__main__":
    main()
