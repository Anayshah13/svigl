"""Research-page helpers: Quick, Draw! samples for the comparative study."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query

from app.services.quickdraw import (
    ALLOWED_WORDS,
    DATASET_REPO,
    QuickDrawError,
    load_samples,
)

router = APIRouter(prefix="/research", tags=["research"])

_DEFAULT = [
    "cat",
    "house",
    "car",
    "fish",
    "star",
    "apple",
    "dog",
    "tree",
    "cup",
    "hat",
    "moon",
    "chair",
    "shoe",
    "flower",
    "pizza",
    "clock",
    "key",
    "boat",
    "sun",
    "guitar",
    "book",
    "ice cream",
    "bicycle",
    "bird",
]


@router.get("/quickdraw")
async def quickdraw_samples(
    words: str | None = Query(
        default=None,
        description="Comma-separated Quick, Draw! class names.",
    ),
) -> dict:
    requested = (
        [part.strip() for part in words.split(",") if part.strip()]
        if words
        else list(_DEFAULT)
    )
    if len(requested) > 24:
        raise HTTPException(status_code=400, detail="At most 24 classes.")
    try:
        samples = await load_samples(requested)
    except QuickDrawError as exc:
        raise HTTPException(status_code=exc.status_code, detail=str(exc)) from exc
    return {
        "source": DATASET_REPO,
        "dump": "full/simplified ndjson",
        "license": "CC BY 4.0",
        "attribution": "Quick, Draw! dataset © Google, Inc.",
        "classes": sorted(ALLOWED_WORDS),
        "samples": samples,
    }
