"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { createRoom } from "@/services/room";
import { useSessionStore } from "@/stores/session";

export function CreateRoomButton({ size = "sm" }: { size?: "sm" | "md" | "lg" }) {
  const router = useRouter();
  const displayName = useSessionStore((s) => s.displayName);
  const [busy, setBusy] = useState(false);

  const handleCreate = async () => {
    setBusy(true);
    try {
      const code = await createRoom(displayName);
      router.push(`/room/${code}`);
    } catch {
      // Room creation is local-only; errors are unexpected.
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button size={size} onClick={() => void handleCreate()} disabled={busy}>
      Create room
    </Button>
  );
}
