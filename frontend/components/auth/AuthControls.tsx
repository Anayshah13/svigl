"use client";

import * as React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { signInAsGuest, signInAsMockUser, signOut } from "@/services/auth";
import { useSessionStore } from "@/stores/session";

export function AuthControls() {
  const authUser = useSessionStore((s) => s.authUser);
  const authReady = useSessionStore((s) => s.authReady);
  const setAuth = useSessionStore((s) => s.setAuth);
  const clearAuth = useSessionStore((s) => s.clearAuth);
  const [busy, setBusy] = React.useState(false);

  const handleSignIn = async (asUser: boolean) => {
    setBusy(true);
    try {
      const user = asUser ? await signInAsMockUser() : await signInAsGuest();
      setAuth(user);
    } finally {
      setBusy(false);
    }
  };

  const handleSignOut = async () => {
    setBusy(true);
    try {
      await signOut();
      clearAuth();
    } finally {
      setBusy(false);
    }
  };

  if (!authReady) {
    return <span className="text-xs text-gray-400">…</span>;
  }

  if (authUser) {
    return (
      <div className="flex items-center gap-2">
        <Link
          href="/profile"
          className="flex items-center gap-2 rounded-full py-1 pl-1 pr-3 transition-colors hover:bg-gray-100"
        >
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-plum-light text-xs font-bold text-plum">
            {authUser.username.charAt(0).toUpperCase()}
          </div>
          <span className="hidden text-sm font-medium text-gray-600 sm:inline">
            {authUser.username}
          </span>
        </Link>
        <Button variant="ghost" size="sm" onClick={() => void handleSignOut()} disabled={busy}>
          Sign out
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="sm" onClick={() => void handleSignIn(true)} disabled={busy}>
        Mock user
      </Button>
      <Button variant="ghost" size="sm" onClick={() => void handleSignIn(false)} disabled={busy}>
        Mock guest
      </Button>
    </div>
  );
}
