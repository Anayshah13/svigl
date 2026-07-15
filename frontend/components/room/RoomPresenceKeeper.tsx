"use client";

import { useEffect } from "react";
import { appWebSocket } from "@/services/app-websocket";
import { wsDebug } from "@/lib/ws-debug";
import { useRoomPresence } from "@/hooks/useRoomPresence";
import { useSessionStore } from "@/stores/session";
import { useRoomStore } from "@/stores/room";

/** Global app WebSocket + presence lifecycle for the active room session. */
export function RoomPresenceKeeper() {
  const authReady = useSessionStore((s) => s.authReady);
  const selfId = useSessionStore((s) => s.selfId);
  const activeRoom = useRoomStore((s) => s.activeRoom);

  useEffect(() => {
    wsDebug("keeper_mount", { component: "RoomPresenceKeeper", userId: selfId });
    return () => {
      wsDebug("keeper_unmount", { component: "RoomPresenceKeeper", userId: selfId });
    };
  }, [selfId]);

  // One authenticated WebSocket per tab while signed in.
  useEffect(() => {
    if (!authReady || !selfId) {
      appWebSocket.disconnect();
      return;
    }

    appWebSocket.connect(selfId);
    return () => {
      // Tab/session teardown handled by auth sign-out paths.
    };
  }, [authReady, selfId]);

  // Room membership on the same socket — no new WebSocket per room.
  // Only leave the channel when we previously had a room code (avoid racing
  // hydration and dropping TIMER_UPDATED / phase events).
  useEffect(() => {
    if (!authReady || !selfId) return;

    if (!activeRoom?.code) {
      if (appWebSocket.activeRoomCode) {
        appWebSocket.leaveRoom();
      }
      return;
    }

    appWebSocket.joinRoom(activeRoom.code);
  }, [activeRoom?.code, authReady, selfId]);

  useRoomPresence(
    activeRoom?.code ?? null,
    Boolean(authReady && selfId && activeRoom),
  );

  return null;
}
