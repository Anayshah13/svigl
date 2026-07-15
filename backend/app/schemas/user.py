from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    provider: str
    email: EmailStr | None
    name: str
    avatar_url: str | None
    drawings_done: int = 0
    likes_received: int = 0
    created_at: datetime
    updated_at: datetime


class GuestAuthRequest(BaseModel):
    guest_device_id: UUID = Field(description="Stable device identifier stored in localStorage")


class GuestAuthResponse(UserResponse):
    """Guest login includes access_token for browsers that block cross-site cookies."""

    access_token: str


class UpdateProfileRequest(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=50)
    avatar_url: str | None = Field(default=None, max_length=500_000)
    remove_avatar: bool = False
