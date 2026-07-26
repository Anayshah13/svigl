"""Gallery browse + reaction REST API."""

from __future__ import annotations

from typing import Literal
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user, get_current_user_optional
from app.db.session import get_db
from app.models.user import User
from app.schemas.gallery import (
    GalleryDrawingResponse,
    GalleryListResponse,
    ReactionStateResponse,
    ReactionUpdateRequest,
)
from app.services.drawings import (
    DrawingError,
    gallery_count,
    get_published_drawing,
    list_gallery,
    set_gallery_reaction,
)

router = APIRouter(prefix="/gallery", tags=["gallery"])


def _to_item(drawing, my_reaction) -> GalleryDrawingResponse:
    author = drawing.author
    return GalleryDrawingResponse(
        id=drawing.id,
        author_id=drawing.author_id,
        author_name=author.name if author else "Unknown",
        author_avatar_url=author.avatar_url if author else None,
        word=drawing.word,
        document=drawing.document or {"version": 1, "viewBox": {"width": 800, "height": 800}, "shapes": [], "exportedAt": 0},
        likes=int(drawing.likes_count or 0),
        dislikes=int(drawing.dislikes_count or 0),
        my_reaction=my_reaction,
        published_at=drawing.published_at,
        created_at=drawing.created_at,
    )


@router.get("", response_model=GalleryListResponse)
def browse_gallery(
    sort: Literal["recent", "top"] = Query(default="recent"),
    author_id: UUID | None = Query(default=None),
    q: str | None = Query(default=None, max_length=64),
    limit: int = Query(default=48, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
    viewer: User | None = Depends(get_current_user_optional),
) -> GalleryListResponse:
    viewer_id = viewer.id if viewer else None
    rows = list_gallery(
        db,
        sort=sort,
        author_id=author_id,
        q=q,
        limit=limit,
        offset=offset,
        viewer_id=viewer_id,
    )
    total = gallery_count(db, author_id=author_id, q=q)
    return GalleryListResponse(
        items=[_to_item(drawing, mine) for drawing, mine in rows],
        total=total,
    )


@router.get("/{drawing_id}", response_model=GalleryDrawingResponse)
def get_gallery_drawing(
    drawing_id: UUID,
    db: Session = Depends(get_db),
    viewer: User | None = Depends(get_current_user_optional),
) -> GalleryDrawingResponse:
    try:
        drawing, mine = get_published_drawing(
            db, drawing_id, viewer_id=viewer.id if viewer else None
        )
    except DrawingError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.message) from exc
    return _to_item(drawing, mine)


@router.put("/{drawing_id}/reaction", response_model=ReactionStateResponse)
def update_gallery_reaction(
    drawing_id: UUID,
    body: ReactionUpdateRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> ReactionStateResponse:
    try:
        state = set_gallery_reaction(
            db,
            drawing_id=drawing_id,
            user_id=user.id,
            reaction=body.reaction,
        )
    except DrawingError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.message) from exc
    return ReactionStateResponse(
        drawing_id=state.drawing_id,
        likes=state.likes,
        dislikes=state.dislikes,
        my_reaction=state.my_reaction,
    )
