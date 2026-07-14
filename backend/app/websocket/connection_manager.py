"""
Global WebSocket connection registry.

Tracks authenticated connections keyed by user_id. Does NOT store game logic.
"""

from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass
from uuid import UUID

from fastapi import WebSocket

logger = logging.getLogger(__name__)


@dataclass
class ConnectedClient:
    """An authenticated WebSocket connection."""

    websocket: WebSocket
    user_id: UUID
    user_name: str
    avatar_url: str | None
    room_code: str | None = None


class ConnectionManager:
    """Process-wide connection registry. One instance shared across the app."""

    def __init__(self) -> None:
        self._connections: dict[UUID, ConnectedClient] = {}
        self._lock = asyncio.Lock()

    async def register(self, client: ConnectedClient) -> ConnectedClient | None:
        """
        Register a new connection. If the user already has a connection
        (duplicate tab), close the old one and replace it.
        Returns the evicted client if any.
        """
        async with self._lock:
            existing = self._connections.get(client.user_id)
            if existing is not None:
                logger.info(
                    "connection_manager evict user=%s old_socket=%s new_socket=%s",
                    client.user_id,
                    id(existing.websocket),
                    id(client.websocket),
                )
                try:
                    await existing.websocket.close(code=4001, reason="Replaced by new connection")
                except Exception:
                    pass
            self._connections[client.user_id] = client
            logger.info(
                "connection_manager register user=%s socket=%s active_count=%s",
                client.user_id,
                id(client.websocket),
                len(self._connections),
            )
            return existing

    async def unregister(self, client: ConnectedClient) -> bool:
        """
        Remove a connection only if it is still the active socket for that user.
        Prevents a replaced (old) socket's finally block from dropping the new one.
        """
        async with self._lock:
            current = self._connections.get(client.user_id)
            if current is None:
                return False
            if current.websocket is not client.websocket:
                logger.info(
                    "connection_manager unregister_skipped user=%s old_socket=%s active_socket=%s",
                    client.user_id,
                    id(client.websocket),
                    id(current.websocket),
                )
                return False
            del self._connections[client.user_id]
            logger.info(
                "connection_manager unregister user=%s socket=%s active_count=%s",
                client.user_id,
                id(client.websocket),
                len(self._connections),
            )
            return True

    def get(self, user_id: UUID) -> ConnectedClient | None:
        return self._connections.get(user_id)

    @property
    def active_count(self) -> int:
        return len(self._connections)


connection_manager = ConnectionManager()
