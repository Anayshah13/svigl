"use client";

import * as React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { signOut } from "@/services/auth";
import { useSessionStore } from "@/stores/session";

export function AuthControls() {
  const authUser = useSessionStore((s) => s.authUser);
  const authReady = useSessionStore((s) => s.authReady);
  const clearAuth = useSessionStore((s) => s.clearAuth);
  const [busy, setBusy] = React.useState(false);

  const handleSignOut = async () => {
    setBusy(true);
    try {
      await signOut();
      clearAuth();
    } finally {
      setBusy(false);
    }
  };

  if (!authReady || !authUser) {
    return null;
  }

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
