"use client";

import { usePathname } from "next/navigation";
import * as React from "react";
import { fetchAuthSession } from "@/services/auth";
import { useSessionStore } from "@/stores/session";

/** Temporary audit logging — remove after auth stability is confirmed. */
function authLog(event: string, detail?: Record<string, unknown>): void {
  if (process.env.NODE_ENV === "production") return;
  console.log(`[auth] ${event}`, detail ?? "");
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const renderCountRef = React.useRef(0);
  renderCountRef.current += 1;

  authLog("AuthProvider render", {
    pathname,
    renderCount: renderCountRef.current,
    authReady: useSessionStore.getState().authReady,
    hasUser: Boolean(useSessionStore.getState().authUser),
  });

  React.useEffect(() => {
    authLog("AuthProvider mounted/effect", { pathname });

    const { authReady, setAuthReady } = useSessionStore.getState();

    if (pathname.startsWith("/auth/callback")) {
      authLog("auth state updated", { authReady: true, reason: "callback route" });
      setAuthReady(true);
      return;
    }

    // Bootstrap once per page load. Do not refetch on client navigations —
    // pathname was previously in deps and caused a /me request on every route change.
    if (authReady) {
      authLog("fetchAuthSession skipped", { reason: "auth already bootstrapped" });
      return;
    }

    let cancelled = false;

    fetchAuthSession()
      .then((user) => {
        if (cancelled || !user) return;
        authLog("auth state updated", { userId: user.id, provider: user.provider });
        useSessionStore.getState().setAuth(user);
      })
      .catch(() => {
        // treat a failed session fetch the same as being unauthenticated
      })
      .finally(() => {
        if (!cancelled) {
          authLog("auth state updated", { authReady: true, reason: "bootstrap complete" });
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
