"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { LandingPage } from "@/features/landing/LandingPage";
import { LoaderScreen } from "@/features/loaders";
import { useSessionStore } from "@/stores/session";

export function HomeGate() {
  const router = useRouter();
  const authUser = useSessionStore((s) => s.authUser);
  const authReady = useSessionStore((s) => s.authReady);

  useEffect(() => {
    if (authReady && !authUser) {
      router.replace("/sign-in");
    }
  }, [authReady, authUser, router]);

  if (!authReady) {
    return <LoaderScreen kind="bars" label="Loading…" />;
  }

  if (!authUser) {
    return null;
  }

  return <LandingPage />;
}
