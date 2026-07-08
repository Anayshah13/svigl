"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { disconnectRoomSync, roomSyncAdapter } from "@/lib/room-sync";
import { wsDebug } from "@/lib/ws-debug";
import { claimRoomTab, releaseRoomTab, startRoomTabHeartbeat } from "@/lib/room-tab-lock";
import { redirectToSignInWithReturn } from "@/lib/post-auth-redirect";
import { validateRoomCode } from "@/lib/room-code";
import {
  createRoom,
  fetchActiveRoom,
  fetchRoom,
  isUserInRoom,
  joinRoom,
  kickPlayer as kickPlayerApi,
  leaveRoom,
  transferHost as transferHostApi,
} from "@/services/room";
import { useSessionStore } from "@/stores/session";
import { useRoomStore } from "@/stores/room";
import type { Room, RoomError } from "@/types/room";
import { ROOM_ERROR_MESSAGES } from "@/types/room";

function redirectToSignIn(
  router: ReturnType<typeof useRouter>,
  returnPath?: string,
): void {
  redirectToSignInWithReturn(
    router,
    returnPath,
    "Your session expired. Sign in again to rejoin your room.",
  );
}

async function recoverActiveRoomOnConflict(): Promise<void> {
  const active = await fetchActiveRoom().catch(() => null);
  if (active) {
    useRoomStore.getState().setActiveRoom(active);
  }
}

/** Create / join actions for the homepage — no polling. */
export function useRoomActions() {
  const router = useRouter();
  const authReady = useSessionStore((s) => s.authReady);

  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<RoomError | null>(null);

  const createInFlight = useRef(false);
  const joinInFlight = useRef(false);

  const clearError = useCallback(() => setError(null), []);

  const handleAuthError = useCallback(
    (roomError: RoomError) => {
      if (roomError.code === "AUTH_EXPIRED") {
        redirectToSignIn(router);
        return true;
      }
      return false;
    },
    [router],
  );

  const create = useCallback(async () => {
    if (createInFlight.current || creating) return;
    createInFlight.current = true;
    setCreating(true);
    setError(null);

    try {
      const room = await createRoom();
      useRoomStore.getState().setActiveRoom(room);
      router.push(`/room/${room.code}`);
    } catch (caught) {
      const roomError = caught as RoomError;
      if (!handleAuthError(roomError)) {
        if (roomError.code === "ALREADY_IN_ROOM") {
          await recoverActiveRoomOnConflict();
        }
        setError(roomError);
      }
    } finally {
      createInFlight.current = false;
      setCreating(false);
    }
  }, [creating, handleAuthError, router]);

  const join = useCallback(
    async (rawCode: string) => {
      if (joinInFlight.current || joining) return;

      const validationError = validateRoomCode(rawCode);
      if (validationError) {
        setError(validationError);
        return;
      }

      joinInFlight.current = true;
      setJoining(true);
      setError(null);

      try {
        const room = await joinRoom(rawCode);
        useRoomStore.getState().setActiveRoom(room);
        router.push(`/room/${room.code}`);
      } catch (caught) {
        const roomError = caught as RoomError;
        if (!handleAuthError(roomError)) {
          if (roomError.code === "ALREADY_IN_ROOM") {
            await recoverActiveRoomOnConflict();
          }
          setError(roomError);
        }
      } finally {
        joinInFlight.current = false;
        setJoining(false);
      }
    },
    [joining, handleAuthError, router],
  );

  return {
    createRoom: create,
    joinRoom: join,
    creating,
    joining,
    busy: creating || joining,
    error,
    clearError,
    authReady,
  };
}

interface UseRoomOptions {
  /** Attempt to join when the user navigates directly without membership. */
  autoJoin?: boolean;
}

/** Room page state: load, poll, leave, membership checks. */
export function useRoom(code: string, options: UseRoomOptions = {}) {
  const router = useRouter();
  const selfId = useSessionStore((s) => s.selfId);
  const authUser = useSessionStore((s) => s.authUser);
  const authReady = useSessionStore((s) => s.authReady);

  const [room, setRoom] = useState<Room | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<RoomError | null>(null);
  const [leaving, setLeaving] = useState(false);
  const [notMember, setNotMember] = useState(false);
  const [tabBlocked, setTabBlocked] = useState(false);
  const [joining, setJoining] = useState(false);
  const [awaitingSignIn, setAwaitingSignIn] = useState(false);

  const leaveInFlight = useRef(false);
  const joinInFlight = useRef(false);
  const normalizedCode = code.trim().toUpperCase();
  const codeValidationError = validateRoomCode(code);

  const handleAuthError = useCallback(
    (roomError: RoomError) => {
      if (roomError.code === "AUTH_EXPIRED") {
        redirectToSignIn(router, `/room/${normalizedCode}`);
        return true;
      }
      return false;
    },
    [normalizedCode, router],
  );

  const applyRoom = useCallback(
    (nextRoom: Room) => {
      setRoom(nextRoom);
      setError(null);

      if (selfId && !isUserInRoom(nextRoom, selfId)) {
        setNotMember(true);
      } else {
        setNotMember(false);
        if (selfId) {
          useRoomStore.getState().setActiveRoom(nextRoom);
        }
      }
    },
    [selfId],
  );

  const retry = useCallback(async () => {
    setLoading(true);
    setError(null);
    setNotMember(false);

    try {
      const nextRoom = await fetchRoom(normalizedCode);
      applyRoom(nextRoom);
    } catch (caught) {
      const roomError = caught as RoomError;
      if (!handleAuthError(roomError)) {
        setError(roomError);
      }
    } finally {
      setLoading(false);
    }
  }, [applyRoom, handleAuthError, normalizedCode]);

  const attemptJoin = useCallback(async () => {
    if (joinInFlight.current || joining) return;
    joinInFlight.current = true;
    setJoining(true);
    setError(null);

    try {
      const nextRoom = await joinRoom(normalizedCode);
      applyRoom(nextRoom);
    } catch (caught) {
      const roomError = caught as RoomError;
      if (!handleAuthError(roomError)) {
        setError(roomError);
      }
    } finally {
      joinInFlight.current = false;
      setJoining(false);
    }
  }, [applyRoom, handleAuthError, joining, normalizedCode]);

  const leave = useCallback(async () => {
    if (leaveInFlight.current || leaving) return;
    leaveInFlight.current = true;
    setLeaving(true);
    setError(null);

    try {
      await leaveRoom(normalizedCode);
      disconnectRoomSync();
      setRoom(null);
      setNotMember(false);
      useRoomStore.getState().clearActiveRoom();
      if (selfId) {
        releaseRoomTab(selfId, normalizedCode);
      }
      router.replace("/");
    } catch (caught) {
      const roomError = caught as RoomError;
      if (!handleAuthError(roomError)) {
        setError(roomError);
      }
    } finally {
      leaveInFlight.current = false;
      setLeaving(false);
    }
  }, [handleAuthError, leaving, normalizedCode, router]);

  const kick = useCallback(
    async (targetId: string) => {
      setError(null);
      try {
        const nextRoom = await kickPlayerApi(normalizedCode, targetId);
        applyRoom(nextRoom);
      } catch (caught) {
        const roomError = caught as RoomError;
        if (!handleAuthError(roomError)) {
          setError(roomError);
        }
      }
    },
    [applyRoom, handleAuthError, normalizedCode],
  );

  const makeHost = useCallback(
    async (targetId: string) => {
      setError(null);
      try {
        const nextRoom = await transferHostApi(normalizedCode, targetId);
        applyRoom(nextRoom);
      } catch (caught) {
        const roomError = caught as RoomError;
        if (!handleAuthError(roomError)) {
          setError(roomError);
        }
      }
    },
    [applyRoom, handleAuthError, normalizedCode],
  );

  // Invite links: unauthenticated visitors must sign in before the room can load.
  useEffect(() => {
    if (!authReady) return;

    if (codeValidationError) {
      setError(codeValidationError);
      setLoading(false);
      return;
    }

    if (!selfId) {
      setAwaitingSignIn(true);
      redirectToSignInWithReturn(
        router,
        `/room/${normalizedCode}`,
        "Sign in to join this room.",
      );
    }
  }, [authReady, codeValidationError, normalizedCode, router, selfId]);

  const isMember = Boolean(room && selfId && isUserInRoom(room, selfId));

  // Tab lock + initial REST load (no WebSocket yet)
  useEffect(() => {
    if (!authReady || !selfId || codeValidationError) return;

    const claim = claimRoomTab(selfId, normalizedCode);
    if (claim === "blocked") {
      setTabBlocked(true);
      setLoading(false);
      setError({ code: "TAB_BLOCKED", message: ROOM_ERROR_MESSAGES.TAB_BLOCKED });
      return;
    }

    setTabBlocked(false);
    const stopHeartbeat = startRoomTabHeartbeat(selfId, normalizedCode);

    let firstLoad = true;

    const unsubscribe = roomSyncAdapter.subscribe(
      normalizedCode,
      (nextRoom) => {
        applyRoom(nextRoom);
        if (firstLoad) {
          firstLoad = false;
          setLoading(false);
        }
      },
      (roomError) => {
        if (!handleAuthError(roomError)) {
          setError(roomError);
        }
        if (firstLoad) {
          firstLoad = false;
          setLoading(false);
        }
      },
      { enableWebSocket: false },
    );

    return () => {
      unsubscribe();
      stopHeartbeat();
    };
  }, [applyRoom, authReady, codeValidationError, handleAuthError, normalizedCode, selfId]);

  // WebSocket realtime sync — only after confirmed membership
  useEffect(() => {
    wsDebug("useRoom_ws_effect_mount", {
      component: "useRoom",
      userId: selfId,
      roomCode: normalizedCode,
      detail: `isMember=${isMember}`,
    });

    if (!authReady || !selfId || codeValidationError || tabBlocked || !isMember) {
      return () => {
        wsDebug("useRoom_ws_effect_unmount", {
          component: "useRoom",
          userId: selfId,
          roomCode: normalizedCode,
        });
      };
    }

    const unsubscribe = roomSyncAdapter.subscribe(
      normalizedCode,
      (nextRoom) => applyRoom(nextRoom),
      (roomError) => {
        if (!handleAuthError(roomError)) {
          setError(roomError);
        }
      },
      { enableWebSocket: true, skipInitialFetch: true },
    );

    return () => {
      wsDebug("useRoom_ws_effect_unmount", {
        component: "useRoom",
        userId: selfId,
        roomCode: normalizedCode,
      });
      unsubscribe();
    };
  }, [
    applyRoom,
    authReady,
    codeValidationError,
    handleAuthError,
    isMember,
    normalizedCode,
    selfId,
    tabBlocked,
  ]);

  // Auto-join when user lands on /room/{code} without membership (e.g. bookmark)
  useEffect(() => {
    if (!options.autoJoin || !authReady || loading || tabBlocked || joining) return;
    if (!notMember || error) return;
    void attemptJoin();
  }, [attemptJoin, authReady, error, joining, loading, notMember, options.autoJoin, tabBlocked]);

  const isHost = Boolean(room && selfId && room.hostId === selfId);
  const currentPlayer = room?.players.find((player) => player.id === selfId) ?? null;

  return {
    room,
    loading: !authReady || awaitingSignIn || loading,
    error,
    leaving,
    joining,
    notMember: notMember && !joining,
    tabBlocked,
    isHost,
    isMember,
    currentPlayer,
    authUser,
    leaveRoom: leave,
    kickPlayer: kick,
    transferHost: makeHost,
    retry,
    attemptJoin,
  };
}
