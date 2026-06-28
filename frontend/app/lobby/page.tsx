"use client";

import { useEffect } from "react";
import { LobbyView } from "@/features/lobby/LobbyView";
import { DEMO_ROOM_CODE, fetchMockLobby } from "@/services/room";
import { useDocumentStore } from "@/stores/document";
import { useRoomStore } from "@/stores/room";
import { useSessionStore } from "@/stores/session";

function useMockLobby(roomCode: string) {
  useEffect(() => {
    const displayName = useSessionStore.getState().displayName || "You";
    void fetchMockLobby(roomCode, displayName).then((room) => {
      useRoomStore.getState().reset();
      useRoomStore.getState().setRoom(room);
      useSessionStore.getState().setSelfId(room.hostId);
      useDocumentStore.getState().setDocument(null);
    });
  }, [roomCode]);
}

export default function LobbyPage() {
  useMockLobby(DEMO_ROOM_CODE);
  return <LobbyView roomCode={DEMO_ROOM_CODE} />;
}
