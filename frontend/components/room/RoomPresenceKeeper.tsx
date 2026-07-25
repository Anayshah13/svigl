"use client";

import { useEffect } from "react";
import { useRoomPresence } from "@/hooks/useRoomPresence";
import { claimRoomTab, startRoomTabHeartbeat } from "@/lib/room-tab-lock";
import { appWebSocket } from "@/services/app-websocket";
import { useSessionStore } from "@/stores/session";
import { useRoomStore } from "@/stores/room";

/** Global app WebSocket + presence lifecycle for the active room session. */
export function RoomPresenceKeeper() {
  const authReady = useSessionStore((s) => s.authReady);
  const selfId = useSessionStore((s) => s.selfId);
  const activeRoom = useRoomStore((s) => s.activeRoom);
  const roomCode = activeRoom?.code ?? null;

  useEffect(() => {
    if (!authReady || !selfId) {
      appWebSocket.disconnect();
      return;
    }

    if (roomCode) {
      const claim = claimRoomTab(selfId, roomCode);
      if (claim === "blocked") {
        // Another tab owns this room session — do not steal the socket.
        appWebSocket.disconnect();
        return;
      }

      const stopHeartbeat = startRoomTabHeartbeat(selfId, roomCode, () => {
        appWebSocket.disconnect();
      });

      appWebSocket.connect(selfId);
      appWebSocket.joinRoom(roomCode);

      return () => {
        stopHeartbeat();
      };
    }

    appWebSocket.connect(selfId);
    if (appWebSocket.activeRoomCode) {
      appWebSocket.leaveRoom();
    }
  }, [authReady, roomCode, selfId]);

  useRoomPresence(roomCode, Boolean(authReady && selfId && roomCode));

  return null;
}
