"""Pydantic schemas for gallery drawings and reactions."""

from __future__ import annotations

from datetime import datetime
from typing import Any, Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class ReactionUpdateRequest(BaseModel):
    """null clears the viewer's reaction."""

    reaction: Literal["like", "dislike"] | None = None


class ReactionStateResponse(BaseModel):
    drawing_id: UUID
    likes: int
    dislikes: int
    my_reaction: Literal["like", "dislike"] | None = None


class GalleryDrawingResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    author_id: UUID
    author_name: str
    author_avatar_url: str | None = None
    word: str
    document: dict[str, Any]
    likes: int
    dislikes: int
    my_reaction: Literal["like", "dislike"] | None = None
    published_at: datetime | None = None
    created_at: datetime


class GalleryListResponse(BaseModel):
    items: list[GalleryDrawingResponse]
    total: int = Field(ge=0)
