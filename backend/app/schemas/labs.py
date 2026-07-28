"""Pydantic schemas for Labs leaderboards."""

from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class LabScoreSubmitRequest(BaseModel):
    score: float = Field(..., gt=0, le=100)


class LabLeaderboardEntry(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    rank: int
    user_id: UUID
    player: str
    score: float
    updated_at: datetime


class LabLeaderboardResponse(BaseModel):
    lab_slug: str
    entries: list[LabLeaderboardEntry]
    total: int
    my_best: float | None = None
    my_rank: int | None = None


class LabLeaderboardSummaryItem(BaseModel):
    lab_slug: str
    top_score: float | None = None
    entry_count: int
    top_player: str | None = None


class LabLeaderboardSummariesResponse(BaseModel):
    items: list[LabLeaderboardSummaryItem]


class LabScoreSubmitResponse(BaseModel):
    lab_slug: str
    score: float
    is_personal_best: bool
    updated_at: datetime
    rank: int | None = None
