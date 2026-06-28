"use client";

import { useEffect } from "react";
import { GameView } from "@/features/game/GameView";
import { fetchMockGame } from "@/services/game";
import { DEMO_ROOM_CODE } from "@/services/room";
import { useDocumentStore } from "@/stores/document";
import { useRoomStore } from "@/stores/room";
import { useSessionStore } from "@/stores/session";

export default function GamePage() {
  useEffect(() => {
    const displayName = useSessionStore.getState().displayName || "You";
    void fetchMockGame(DEMO_ROOM_CODE, displayName).then(({ room, chat }) => {
      useRoomStore.getState().reset();
      useRoomStore.getState().setRoom(room);
      useRoomStore.getState().setChat(chat);
      useSessionStore.getState().setSelfId(room.hostId);
      useDocumentStore.getState().setDocument(room.document);
    });
  }, []);

  return <GameView />;
}
