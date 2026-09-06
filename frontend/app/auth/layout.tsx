import type { Metadata } from "next";
import type { ReactNode } from "react";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "Signing in",
  description: "Completing Svigl sign-in.",
  path: "/auth/callback",
  index: false,
});

export default function AuthLayout({ children }: { children: ReactNode }) {
  return children;
}
