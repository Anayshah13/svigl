"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { LandingPage } from "@/features/landing/LandingPage";
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
    return (
      <div className="flex flex-1 items-center justify-center px-6 py-24">
        <p className="text-sm font-medium text-ink-muted">Loading…</p>
      </div>
    );
  }

  if (!authUser) {
    return null;
  }

  return <LandingPage />;
}
