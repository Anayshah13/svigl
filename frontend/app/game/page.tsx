"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { GameView } from "@/features/game/GameView";
import { useRoomStore } from "@/stores/room";

export default function GamePage() {
  const router = useRouter();
  const room = useRoomStore((s) => s.room);

  useEffect(() => {
    if (!room?.game) {
      router.replace("/");
    }
  }, [room, router]);

  if (!room?.game) {
    return null;
  }

  return <GameView />;
}
