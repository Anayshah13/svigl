import type { Metadata } from "next";
import { Suspense } from "react";
import { SignInPage } from "@/features/auth/SignInPage";
import { LoaderScreen } from "@/features/loaders";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "Sign in",
  description:
    "Sign in to Svigl, Anay Shah’s multiplayer SVG drawing game. Join with Google or play as a guest.",
  path: "/sign-in",
});

export default function SignInRoute() {
  return (
    <Suspense fallback={<LoaderScreen kind="bars" label="Loading…" />}>
      <SignInPage />
    </Suspense>
  );
}
