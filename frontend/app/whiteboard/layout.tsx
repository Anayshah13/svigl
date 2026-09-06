import type { Metadata } from "next";
import type { ReactNode } from "react";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "Whiteboard",
  description: "Local SVG whiteboard playground for Svigl.",
  path: "/whiteboard",
  index: false,
});

export default function WhiteboardLayout({ children }: { children: ReactNode }) {
  return children;
}
