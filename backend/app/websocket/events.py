"""
Typed WebSocket event protocol.

Every message over the wire conforms to: {"type": "<EVENT_TYPE>", "payload": {...}}
New event types can be added here without changing transport logic.
"""

from __future__ import annotations

from enum import StrEnum
from typing import Any

from pydantic import BaseModel, Field


class EventType(StrEnum):
    # Heartbeat
    PING = "PING"
    PONG = "PONG"

    # Presence
    PLAYER_JOINED = "PLAYER_JOINED"
    PLAYER_LEFT = "PLAYER_LEFT"
    PLAYER_CONNECTED = "PLAYER_CONNECTED"
    PLAYER_DISCONNECTED = "PLAYER_DISCONNECTED"

    # Room session (client → server)
    JOIN_ROOM = "JOIN_ROOM"
    LEAVE_ROOM = "LEAVE_ROOM"
    ROOM_LEFT = "ROOM_LEFT"
    ROOM_UPDATED = "ROOM_UPDATED"
    PLAYER_KICKED = "PLAYER_KICKED"

    # System
    ERROR = "ERROR"


class WSMessage(BaseModel):
    """Canonical wire format for all WebSocket messages."""

    type: EventType
    payload: dict[str, Any] = Field(default_factory=dict)


def make_event(event_type: EventType, **payload: Any) -> str:
    """Serialize an event to JSON string ready for sending."""
    return WSMessage(type=event_type, payload=payload).model_dump_json()


def parse_client_message(raw: str) -> WSMessage | None:
    """Parse an incoming client message. Returns None on invalid input."""
    try:
        return WSMessage.model_validate_json(raw)
    except Exception:
        return None
