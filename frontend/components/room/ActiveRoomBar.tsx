"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { redirectToSignInWithReturn } from "@/lib/post-auth-redirect";
import { releaseRoomTab } from "@/lib/room-tab-lock";
import { fetchActiveRoom, fetchRoom, isUserInRoom, leaveRoom } from "@/services/room";
import { useSessionStore } from "@/stores/session";
import { readPersistedRoomCode, useRoomStore } from "@/stores/room";
import { ROOM_STATUS_LABELS, type RoomError } from "@/types/room";

const REFRESH_INTERVAL_MS = 10_000;

/** Keeps active-room state in sync with the backend across page navigations. */
export function useActiveRoomSession() {
  const router = useRouter();
  const pathname = usePathname();
  const authReady = useSessionStore((s) => s.authReady);
  const selfId = useSessionStore((s) => s.selfId);

  const activeRoom = useRoomStore((s) => s.activeRoom);
  const setActiveRoom = useRoomStore((s) => s.setActiveRoom);
  const syncActiveRoom = useRoomStore((s) => s.syncActiveRoom);
  const clearActiveRoom = useRoomStore((s) => s.clearActiveRoom);

  const [leaving, setLeaving] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const leaveInFlight = useRef(false);

  const refreshActiveRoom = useCallback(async () => {
    if (!selfId) return;

    let code = useRoomStore.getState().activeRoom?.code ?? readPersistedRoomCode();

    try {
      let room = code ? await fetchRoom(code) : await fetchActiveRoom();

      if (!room || !isUserInRoom(room, selfId)) {
        room = await fetchActiveRoom();
      }

      if (!room || !isUserInRoom(room, selfId)) {
        clearActiveRoom();
        return;
      }

      syncActiveRoom(room);
    } catch (error) {
      const roomError = error as RoomError;
      if (roomError.code === "AUTH_EXPIRED") {
        redirectToSignInWithReturn(
          router,
          activeRoom ? `/room/${activeRoom.code}` : undefined,
          "Your session expired. Sign in again to rejoin your room.",
        );
        return;
      }
      if (roomError.code === "ROOM_NOT_FOUND" || roomError.code === "ROOM_FINISHED") {
        clearActiveRoom();
      }
    }
  }, [activeRoom, clearActiveRoom, router, selfId, syncActiveRoom]);

  // Restore session from localStorage after auth bootstrap
  useEffect(() => {
    if (!authReady || !selfId) {
      if (authReady && !selfId) {
        clearActiveRoom();
        setHydrated(true);
      }
      return;
    }

    let cancelled = false;

    const hydrate = async () => {
      let code = readPersistedRoomCode();

      try {
        let room = code ? await fetchRoom(code) : null;

        if (!room || !isUserInRoom(room, selfId)) {
          room = await fetchActiveRoom();
        }

        if (cancelled) return;

        if (room && isUserInRoom(room, selfId)) {
          setActiveRoom(room);
        } else {
          clearActiveRoom();
        }
      } catch (error) {
        if (cancelled) return;
        const roomError = error as RoomError;
        if (roomError.code === "AUTH_EXPIRED") {
          redirectToSignInWithReturn(
            router,
            code ? `/room/${code}` : undefined,
            "Your session expired. Sign in again to rejoin your room.",
          );
        } else {
          clearActiveRoom();
        }
      } finally {
        if (!cancelled) setHydrated(true);
      }
    };

    void hydrate();

    return () => {
      cancelled = true;
    };
  }, [authReady, clearActiveRoom, router, selfId, setActiveRoom]);

  // Light polling while the bar may be visible (not on the room page itself)
  useEffect(() => {
    if (!hydrated || !activeRoom || !selfId) return;

    const onRoomPage = pathname === `/room/${activeRoom.code}`;
    if (onRoomPage) return;

    const intervalId = window.setInterval(() => void refreshActiveRoom(), REFRESH_INTERVAL_MS);
    return () => window.clearInterval(intervalId);
  }, [activeRoom, hydrated, pathname, refreshActiveRoom, selfId]);

  const leaveActiveRoom = useCallback(async () => {
    if (!activeRoom || leaveInFlight.current || leaving) return;
    leaveInFlight.current = true;
    setLeaving(true);

    try {
      await leaveRoom(activeRoom.code);
      if (selfId) {
        releaseRoomTab(selfId, activeRoom.code);
      }
      clearActiveRoom();
    } catch (error) {
      const roomError = error as RoomError;
      if (roomError.code === "AUTH_EXPIRED") {
        redirectToSignInWithReturn(
          router,
          activeRoom ? `/room/${activeRoom.code}` : undefined,
          "Your session expired. Sign in again to rejoin your room.",
        );
      } else if (roomError.code === "NOT_IN_ROOM" || roomError.code === "ROOM_NOT_FOUND") {
        clearActiveRoom();
      }
    } finally {
      leaveInFlight.current = false;
      setLeaving(false);
    }
  }, [activeRoom, clearActiveRoom, leaving, router, selfId]);

  const onRoomPage = Boolean(activeRoom && pathname === `/room/${activeRoom.code}`);
  const barVisible = hydrated && Boolean(activeRoom) && !onRoomPage;

  return {
    activeRoom,
    barVisible,
    leaving,
    leaveActiveRoom,
    returnHref: activeRoom ? `/room/${activeRoom.code}` : "/",
  };
}

export function ActiveRoomBar() {
  const { activeRoom, barVisible, leaving, leaveActiveRoom, returnHref } = useActiveRoomSession();
  const barContainerRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const root = document.documentElement;

    if (!barVisible) {
      root.classList.remove("has-active-room-bar");
      root.style.removeProperty("--active-room-bar-offset");
      return;
    }

    const el = barContainerRef.current;
    if (!el) return;

    const syncOffset = () => {
      root.style.setProperty("--active-room-bar-offset", `${el.offsetHeight}px`);
      root.classList.add("has-active-room-bar");
    };

    syncOffset();

    const observer = new ResizeObserver(syncOffset);
    observer.observe(el);

    return () => {
      observer.disconnect();
      root.classList.remove("has-active-room-bar");
      root.style.removeProperty("--active-room-bar-offset");
    };
  }, [barVisible]);

  if (!barVisible || !activeRoom) {
    return null;
  }

  const statusLabel = ROOM_STATUS_LABELS[activeRoom.status];

  return (
      <div
        ref={barContainerRef}
        className="pointer-events-none fixed inset-x-0 bottom-0 z-50 px-3 pb-3 safe-bottom sm:px-6 sm:pb-5"
      >
        <div
          role="status"
          className="pointer-events-auto mx-auto max-w-7xl rounded-2xl border border-plum/20 bg-white/95 px-4 py-3.5 shadow-[0_12px_40px_-12px_rgba(112,63,147,0.35),0_0_0_1px_rgba(255,255,255,0.9)] backdrop-blur-xl sm:rounded-3xl sm:px-6 sm:py-5"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-4">
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-wider text-plum sm:text-sm">
                Active game session
              </p>
              <p className="mt-0.5 text-sm font-medium text-ink sm:mt-1 sm:text-base">
                You&apos;re in room{" "}
                <span className="font-mono text-base font-bold tracking-[0.15em] text-plum sm:text-lg sm:tracking-[0.2em]">
                  {activeRoom.code}
                </span>
                <span className="hidden text-ink-muted sm:inline"> · </span>
                <span className="block text-ink-muted sm:inline">
                  {statusLabel}
                  <span className="text-ink-muted"> · </span>
                  {activeRoom.playerCount}/{activeRoom.maxPlayers} players
                </span>
              </p>
            </div>

            <div className="flex w-full shrink-0 flex-col gap-2 sm:w-auto sm:flex-row sm:items-center sm:gap-3">
              <Link href={returnHref} className="w-full sm:w-auto">
                <Button type="button" variant="secondary" size="md" className="w-full sm:w-auto">
                  Return to lobby
                </Button>
              </Link>
              <Button
                type="button"
                variant="outline"
                size="md"
                className="w-full sm:w-auto"
                disabled={leaving}
                onClick={() => void leaveActiveRoom()}
              >
                {leaving ? "Leaving…" : "Leave room"}
              </Button>
            </div>
          </div>
        </div>
      </div>
  );
}
