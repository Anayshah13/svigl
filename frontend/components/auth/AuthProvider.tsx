"use client";

import { usePathname } from "next/navigation";
import * as React from "react";
import { fetchAuthSession } from "@/services/auth";
import { useSessionStore } from "@/stores/session";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  React.useEffect(() => {
    const { authReady, setAuthReady } = useSessionStore.getState();

    if (pathname.startsWith("/auth/callback")) {
      setAuthReady(true);
      return;
    }

    // Bootstrap once per page load. Do not refetch on client navigations.
    if (authReady) return;

    let cancelled = false;

    fetchAuthSession()
      .then((user) => {
        if (cancelled || !user) return;
        useSessionStore.getState().setAuth(user);
      })
      .catch(() => {
        // treat a failed session fetch the same as being unauthenticated
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
