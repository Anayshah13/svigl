"use client";

import { useEffect } from "react";
import { initPageLifecycle, isPageReload } from "@/lib/page-lifecycle";
import { releaseRoomTab } from "@/lib/room-tab-lock";
import { isUserInRoom, leaveRoomBeacon, pingRoomPresence } from "@/services/room";
import { useSessionStore } from "@/stores/session";
import { readPersistedRoomCode, useRoomStore } from "@/stores/room";
import type { RoomError } from "@/types/room";

const PRESENCE_INTERVAL_MS = 5_000;

/**
 * Sends periodic presence pings while the user is in a room.
 * Leaves the room on tab/window close — but not on page reload.
 */
export function useRoomPresence(roomCode: string | null, enabled: boolean): void {
  const selfId = useSessionStore((s) => s.selfId);

  useEffect(() => {
    initPageLifecycle();

    const onPageShow = () => {
      const code = useRoomStore.getState().activeRoom?.code ?? readPersistedRoomCode();
      if (code) {
        void pingRoomPresence(code).catch(() => undefined);
      }
    };

    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, []);

  useEffect(() => {
    if (!enabled || !roomCode || !selfId) return;

    let cancelled = false;

    const syncPresence = async () => {
      try {
        const room = await pingRoomPresence(roomCode);
        if (cancelled) return;

        if (isUserInRoom(room, selfId)) {
          useRoomStore.getState().syncActiveRoom(room);
        } else {
          useRoomStore.getState().clearActiveRoom();
        }
      } catch (error) {
        if (cancelled) return;
        const roomError = error as RoomError;
        if (
          roomError.code === "NOT_IN_ROOM" ||
          roomError.code === "ROOM_NOT_FOUND" ||
          roomError.code === "ROOM_FINISHED"
        ) {
          useRoomStore.getState().clearActiveRoom();
        }
      }
    };

    const onPageHide = (event: PageTransitionEvent) => {
      // bfcache restore — user may return to this page
      if (event.persisted) return;

      // Reload also fires pagehide; do not leave or clear persisted room state.
      if (isPageReload()) return;

      leaveRoomBeacon(roomCode);
      releaseRoomTab(selfId, roomCode);
      useRoomStore.getState().clearActiveRoom();
    };

    void syncPresence();
    const intervalId = window.setInterval(() => void syncPresence(), PRESENCE_INTERVAL_MS);
    window.addEventListener("pagehide", onPageHide);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
      window.removeEventListener("pagehide", onPageHide);
    };
  }, [enabled, roomCode, selfId]);
}
