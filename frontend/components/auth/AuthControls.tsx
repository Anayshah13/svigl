"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { signOut } from "@/services/auth";
import { useSessionStore } from "@/stores/session";

export function AuthControls() {
  const router = useRouter();
  const authUser = useSessionStore((s) => s.authUser);
  const authReady = useSessionStore((s) => s.authReady);
  const clearAuth = useSessionStore((s) => s.clearAuth);
  const [busy, setBusy] = React.useState(false);

  const handleSignOut = async () => {
    setBusy(true);
    try {
      await signOut();
      clearAuth();
      router.replace("/sign-in");
    } finally {
      setBusy(false);
    }
  };

  if (!authReady) {
    return null;
  }

  if (!authUser) {
    return (
      <Link
        href="/sign-in"
        className="inline-flex h-9 items-center justify-center rounded-full border border-plum/25 bg-white/80 px-4 text-sm font-semibold text-ink transition-all hover:border-plum/50 hover:bg-white"
      >
        Sign in
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Link
        href="/profile"
        className="flex items-center gap-2 rounded-full py-1 pl-1 pr-3 transition-colors hover:bg-gray-100"
      >
        {authUser.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={authUser.avatarUrl}
            alt=""
            className="h-7 w-7 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-plum-light text-xs font-bold text-plum">
            {authUser.username.charAt(0).toUpperCase()}
          </div>
        )}
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
