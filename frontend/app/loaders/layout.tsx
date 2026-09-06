import type { Metadata } from "next";
import type { ReactNode } from "react";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "Loaders",
  description: "Internal Svigl loader prototype gallery.",
  path: "/loaders",
  index: false,
});

export default function LoadersLayout({ children }: { children: ReactNode }) {
  return children;
}
