"use client";

import * as React from "react";
import { fetchAuthSession } from "@/services/auth";
import { useSessionStore } from "@/stores/session";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const setAuthReady = useSessionStore((s) => s.setAuthReady);

  React.useEffect(() => {
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
  }, [setAuthReady]);

  return <>{children}</>;
}
