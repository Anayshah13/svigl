from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class GoogleProfile:
    google_id: str
    email: str
    name: str
    avatar_url: str | None
