import type { Metadata } from "next";
import type { ReactNode } from "react";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "Settings",
  description: "Account and display-name preferences for Svigl.",
  path: "/settings",
  index: false,
});

export default function SettingsLayout({ children }: { children: ReactNode }) {
  return children;
}
