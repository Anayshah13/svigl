from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    google_id: str | None
    email: EmailStr
    name: str
    avatar_url: str | None
    created_at: datetime
    updated_at: datetime
