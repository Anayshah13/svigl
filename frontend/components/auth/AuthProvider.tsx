"use client";

import { usePathname } from "next/navigation";
import * as React from "react";
import { ensureAuthSession } from "@/services/auth";
import { useSessionStore } from "@/stores/session";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  React.useEffect(() => {
    const { authReady, setAuthReady } = useSessionStore.getState();

    if (pathname.startsWith("/auth/callback")) {
      setAuthReady(true);
      return;
    }

    // Bootstrap once per page load. Do not refetch on client navigations
    // after a live session is already in memory.
    if (authReady && useSessionStore.getState().authUser) return;

    let cancelled = false;

    ensureAuthSession()
      .catch(() => {
        // treat a failed session restore the same as being unauthenticated
      })
      .finally(() => {
        if (!cancelled) {
          useSessionStore.getState().setAuthReady(true);
        }
      });

    return () => {
      cancelled = true;
    };
    // Intentionally run once on mount; pathname is read for the initial route only.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- bootstrap, not per-navigation
  }, []);

  return <>{children}</>;
}
