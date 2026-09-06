import type { Metadata } from "next";
import type { ReactNode } from "react";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "Room",
  description: "Join a private Svigl multiplayer drawing room.",
  path: "/room",
  index: false,
});

export default function RoomLayout({ children }: { children: ReactNode }) {
  return children;
}
