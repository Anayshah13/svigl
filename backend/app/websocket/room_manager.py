"""
WebSocket room state manager.

Manages per-room collections of connected clients, broadcasts, and presence.
Does NOT duplicate REST room logic — works alongside it.
"""

from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass, field
from uuid import UUID

from fastapi import WebSocket

from app.websocket.connection_manager import ConnectedClient
from app.websocket.events import EventType, make_event

logger = logging.getLogger(__name__)


@dataclass
class RoomState:
    """In-memory state for a single room's WebSocket connections."""

    code: str
    clients: dict[UUID, ConnectedClient] = field(default_factory=dict)


class RoomManager:
    def __init__(self) -> None:
        self._rooms: dict[str, RoomState] = {}
        self._lock = asyncio.Lock()

    async def connect(self, client: ConnectedClient, room_code: str) -> None:
        """Add a client to a room and broadcast PLAYER_CONNECTED."""
        async with self._lock:
            room = self._rooms.get(room_code)
            if room is None:
                room = RoomState(code=room_code)
                self._rooms[room_code] = room
            room.clients[client.user_id] = client
            client.room_code = room_code

        await self.broadcast_except(
            room_code,
            client.user_id,
            EventType.PLAYER_CONNECTED,
            player_id=str(client.user_id),
            player_name=client.user_name,
            avatar_url=client.avatar_url,
        )

    async def disconnect(self, client: ConnectedClient) -> None:
        """Remove a client from their room and broadcast PLAYER_DISCONNECTED."""
        room_code = client.room_code
        if room_code is None:
            return

        async with self._lock:
            room = self._rooms.get(room_code)
            if room is None:
                return
            room.clients.pop(client.user_id, None)
            if not room.clients:
                del self._rooms[room_code]

        await self.broadcast(
            room_code,
            EventType.PLAYER_DISCONNECTED,
            player_id=str(client.user_id),
            player_name=client.user_name,
        )

    async def broadcast(
        self, room_code: str, event_type: EventType, **payload: object
    ) -> None:
        """Send an event to ALL connected clients in a room."""
        room = self._rooms.get(room_code)
        if room is None:
            return
        message = make_event(event_type, **payload)
        await self._send_to_clients(list(room.clients.values()), message)

    async def broadcast_except(
        self,
        room_code: str,
        exclude_user_id: UUID,
        event_type: EventType,
        **payload: object,
    ) -> None:
        """Send an event to all clients in a room except one."""
        room = self._rooms.get(room_code)
        if room is None:
            return
        message = make_event(event_type, **payload)
        targets = [c for c in room.clients.values() if c.user_id != exclude_user_id]
        await self._send_to_clients(targets, message)

    async def send_to_user(
        self, room_code: str, user_id: UUID, event_type: EventType, **payload: object
    ) -> None:
        """Send an event to a specific user in a room."""
        room = self._rooms.get(room_code)
        if room is None:
            return
        client = room.clients.get(user_id)
        if client is None:
            return
        message = make_event(event_type, **payload)
        await self._safe_send(client.websocket, message)

    def get_room(self, room_code: str) -> RoomState | None:
        return self._rooms.get(room_code)

    def get_online_player_ids(self, room_code: str) -> list[str]:
        room = self._rooms.get(room_code)
        if room is None:
            return []
        return [str(uid) for uid in room.clients.keys()]

    def remove_empty_room(self, room_code: str) -> bool:
        """Remove a room if it has no connected clients. Returns True if removed."""
        room = self._rooms.get(room_code)
        if room is not None and not room.clients:
            del self._rooms[room_code]
            return True
        return False

    async def _send_to_clients(
        self, clients: list[ConnectedClient], message: str
    ) -> None:
        tasks = [self._safe_send(c.websocket, message) for c in clients]
        await asyncio.gather(*tasks, return_exceptions=True)

    async def _safe_send(self, ws: WebSocket, message: str) -> None:
        try:
            await ws.send_text(message)
        except Exception:
            pass


room_manager = RoomManager()
