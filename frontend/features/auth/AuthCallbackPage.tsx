"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";import { fetchAuthSession } from "@/services/auth";
import { useSessionStore } from "@/stores/session";
import {
  clearStoredPostAuthRedirect,
  resolvePostAuthRedirect,
} from "@/lib/post-auth-redirect";

const AUTH_CALLBACK_KEY = "svigl:auth-callback-processing";

export function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    if (sessionStorage.getItem(AUTH_CALLBACK_KEY) === "done") {
      const destination = resolvePostAuthRedirect(searchParams.get("next"));
      clearStoredPostAuthRedirect();
      router.replace(destination);
      return;
    }

    sessionStorage.setItem(AUTH_CALLBACK_KEY, "processing");

    fetchAuthSession()
      .then((user) => {
        if (!user) {
          sessionStorage.removeItem(AUTH_CALLBACK_KEY);
          router.replace("/sign-in?error=Sign-in%20failed.%20Please%20try%20again.");
          return;
        }

        useSessionStore.getState().setAuth(user);
        useSessionStore.getState().setAuthReady(true);
        sessionStorage.setItem(AUTH_CALLBACK_KEY, "done");
        const destination = resolvePostAuthRedirect(searchParams.get("next"));
        clearStoredPostAuthRedirect();
        router.replace(destination);
      })      .catch(() => {
        sessionStorage.removeItem(AUTH_CALLBACK_KEY);
        router.replace("/sign-in?error=Could%20not%20verify%20your%20session.");
      });
  }, [router, searchParams]);
  return (
    <div className="flex flex-1 items-center justify-center px-6 py-24">
      <p className="text-sm font-medium text-ink-muted">Signing you in…</p>
    </div>
  );
}

