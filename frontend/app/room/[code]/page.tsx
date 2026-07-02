"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";
import { LobbyView } from "@/features/lobby/LobbyView";
import { ensureLocalRoom } from "@/services/localRoom";
import { useDocumentStore } from "@/stores/document";
import { useRoomStore } from "@/stores/room";

export default function RoomPage() {
  const params = useParams();
  const code = typeof params.code === "string" ? params.code.toUpperCase() : "";

  useEffect(() => {
    useRoomStore.getState().reset();
    useDocumentStore.getState().setDocument(null);
    if (code) ensureLocalRoom(code);
  }, [code]);

  if (!code) return null;

  return <LobbyView roomCode={code} />;
}
