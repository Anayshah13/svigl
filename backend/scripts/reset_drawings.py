"""One-shot wipe of all drawing / gallery / reaction data.

Leaves users, rooms, sessions, and auth untouched. Resets per-user drawing
stats (drawings_done, likes_received, dislikes_received) to zero so profile
and gallery empty states match the cleared tables.

Usage (from repo root, with docker compose up):

    docker compose exec backend python -m scripts.reset_drawings

Or against a local venv with DATABASE_URL / POSTGRES_* set:

    python -m scripts.reset_drawings
"""

from __future__ import annotations

import sys
from pathlib import Path

# Allow `python -m scripts.reset_drawings` from /app or backend/.
_BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(_BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(_BACKEND_ROOT))

from sqlalchemy import text

from app.db.session import SessionLocal


def reset_drawings() -> dict[str, int]:
    db = SessionLocal()
    try:
        # Detach live session pointers before deleting drawings.
        cleared_ptrs = db.execute(
            text("UPDATE game_sessions SET current_drawing_id = NULL")
        ).rowcount

        reactions = db.execute(text("DELETE FROM drawing_reactions")).rowcount
        drawings = db.execute(text("DELETE FROM drawings")).rowcount

        # Live boards are not gallery items, but wiping them avoids orphan
        # stroke JSON that could never join a published drawing after reset.
        canvas = db.execute(
            text(
                """
                UPDATE canvas_states
                SET shapes = '[]'::json,
                    undo_stack = '[]'::json,
                    redo_stack = '[]'::json,
                    op_seq = 0
                """
            )
        ).rowcount

        users = db.execute(
            text(
                """
                UPDATE users
                SET drawings_done = 0,
                    likes_received = 0,
                    dislikes_received = 0
                """
            )
        ).rowcount

        db.commit()
        return {
            "game_sessions_cleared": cleared_ptrs or 0,
            "drawing_reactions_deleted": reactions or 0,
            "drawings_deleted": drawings or 0,
            "canvas_states_reset": canvas or 0,
            "users_stats_reset": users or 0,
        }
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def main() -> None:
    counts = reset_drawings()
    print("Drawing data reset complete:")
    for key, value in counts.items():
        print(f"  {key}: {value}")


if __name__ == "__main__":
    main()
