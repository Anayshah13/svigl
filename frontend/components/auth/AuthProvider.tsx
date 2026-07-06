"use client";

import { usePathname } from "next/navigation";
import * as React from "react";
import { fetchAuthSession } from "@/services/auth";
import { useSessionStore } from "@/stores/session";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const setAuthReady = useSessionStore((s) => s.setAuthReady);

  React.useEffect(() => {
    if (pathname.startsWith("/auth/callback")) {
      setAuthReady(true);
      return;
    }

    let cancelled = false;

    fetchAuthSession()
      .then((user) => {
        if (cancelled || !user) return;
        useSessionStore.getState().setAuth(user);
      })
      .finally(() => {
        if (!cancelled) setAuthReady(true);
      });

    return () => {
      cancelled = true;
    };
  }, [pathname, setAuthReady]);

  return <>{children}</>;
}
