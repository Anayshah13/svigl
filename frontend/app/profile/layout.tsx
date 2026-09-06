import type { Metadata } from "next";
import type { ReactNode } from "react";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "Profile",
  description: "Svigl player profile.",
  path: "/profile",
  index: false,
});

export default function ProfileLayout({ children }: { children: ReactNode }) {
  return children;
}
