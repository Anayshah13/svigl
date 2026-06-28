"use client";

import { useEffect } from "react";
import { LobbyView } from "@/features/lobby/LobbyView";
import { DEMO_ROOM_CODE, fetchMockLobby } from "@/services/room";
import { useDocumentStore } from "@/stores/document";
import { useRoomStore } from "@/stores/room";
import { useSessionStore } from "@/stores/session";

export default function DemoRoomPage() {
  useEffect(() => {
    const displayName = useSessionStore.getState().displayName || "You";
    void fetchMockLobby(DEMO_ROOM_CODE, displayName).then((room) => {
      useRoomStore.getState().reset();
      useRoomStore.getState().setRoom(room);
      useSessionStore.getState().setSelfId(room.hostId);
      useDocumentStore.getState().setDocument(null);
    });
  }, []);

  return <LobbyView roomCode={DEMO_ROOM_CODE} />;
}
