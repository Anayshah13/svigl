from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class GoogleProfile:
    provider_id: str
    email: str
    name: str
    avatar_url: str | None
