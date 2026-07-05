"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";
import { parseAuthCallbackParams, persistAuthUser } from "@/services/auth";
import { useSessionStore } from "@/stores/session";

export function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;

    const user = parseAuthCallbackParams(searchParams);
    if (!user) {
      router.replace("/sign-in?error=Invalid%20sign-in%20response.%20Please%20try%20again.");
      return;
    }

    persistAuthUser(user);
    useSessionStore.getState().setAuth(user);
    router.replace("/");
  }, [router, searchParams]);

  return (
    <div className="flex flex-1 items-center justify-center px-6 py-24">
      <p className="text-sm font-medium text-ink-muted">Signing you in…</p>
    </div>
  );
}
