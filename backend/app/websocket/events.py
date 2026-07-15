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

    # Game lifecycle (client → server)
    PLAYER_READY = "PLAYER_READY"
    PLAYER_UNREADY = "PLAYER_UNREADY"
    HOST_UPDATE_SETTINGS = "HOST_UPDATE_SETTINGS"
    START_GAME = "START_GAME"
    SELECT_WORD = "SELECT_WORD"
    CHAT_MESSAGE = "CHAT_MESSAGE"

    # Game lifecycle (server → client)
    GAME_STARTED = "GAME_STARTED"
    COUNTDOWN_STARTED = "COUNTDOWN_STARTED"
    WORD_CHOICES_OFFERED = "WORD_CHOICES_OFFERED"
    WORD_SELECTED = "WORD_SELECTED"
    ROUND_STARTED = "ROUND_STARTED"
    ROUND_ENDED = "ROUND_ENDED"
    GAME_FINISHED = "GAME_FINISHED"
    TIMER_UPDATED = "TIMER_UPDATED"
    PLAYER_WAITING = "PLAYER_WAITING"
    GAME_STATE_UPDATED = "GAME_STATE_UPDATED"
    HOST_CHANGED = "HOST_CHANGED"
    PLAYER_GUESSED = "PLAYER_GUESSED"
    SCORES_UPDATED = "SCORES_UPDATED"

    # Collaborative canvas (client ↔ server)
    SHAPE_CREATED = "SHAPE_CREATED"
    SHAPE_UPDATED = "SHAPE_UPDATED"
    SHAPE_DELETED = "SHAPE_DELETED"
    CANVAS_CLEARED = "CANVAS_CLEARED"
    UNDO = "UNDO"
    REDO = "REDO"
    CANVAS_SNAPSHOT = "CANVAS_SNAPSHOT"
    # Lifecycle signal from game engine (notify clears DB → CANVAS_CLEARED).
    CANVAS_CLEAR = "CANVAS_CLEAR"
    CANVAS_SNAPSHOT_REQUEST = "CANVAS_SNAPSHOT_REQUEST"

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
