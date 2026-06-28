"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";

export function CreateRoomButton({ size = "sm" }: { size?: "sm" | "md" | "lg" }) {
  const router = useRouter();
  return (
    <Button size={size} onClick={() => router.push("/room/demo")}>
      Create room
    </Button>
  );
}
