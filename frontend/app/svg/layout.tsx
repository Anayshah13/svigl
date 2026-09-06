import type { Metadata } from "next";
import type { ReactNode } from "react";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "Brand SVGs",
  description: "Internal Svigl brand SVG showcase.",
  path: "/svg",
  index: false,
});

export default function SvgLayout({ children }: { children: ReactNode }) {
  return children;
}
