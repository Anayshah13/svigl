"use client";

import { useRoomPresence } from "@/hooks/useRoomPresence";
import { useSessionStore } from "@/stores/session";
import { useRoomStore } from "@/stores/room";

/** Global presence heartbeat + tab-close cleanup for active room sessions. */
export function RoomPresenceKeeper() {
  const authReady = useSessionStore((s) => s.authReady);
  const selfId = useSessionStore((s) => s.selfId);
  const activeRoom = useRoomStore((s) => s.activeRoom);

  useRoomPresence(
    activeRoom?.code ?? null,
    Boolean(authReady && selfId && activeRoom),
  );

  return null;
}
