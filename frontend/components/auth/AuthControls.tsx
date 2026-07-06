"use client";

import * as React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { formatDisplayName } from "@/lib/names";
import { signOut } from "@/services/auth";
import { useSessionStore } from "@/stores/session";

export function AuthControls() {
  const authUser = useSessionStore((s) => s.authUser);
  const authReady = useSessionStore((s) => s.authReady);
  const [busy, setBusy] = React.useState(false);

  const handleSignOut = () => {
    setBusy(true);
    signOut();
  };

  if (!authReady) {
    return null;
  }

  if (!authUser) {
    return (
      <Link
        href="/sign-in"
        className="inline-flex h-9 items-center justify-center rounded-full border border-plum/25 bg-white/80 px-3 text-xs font-semibold text-ink transition-all hover:border-plum/50 hover:bg-white sm:px-4 sm:text-sm"
      >
        Sign in
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-1.5 sm:gap-2">
      <Link
        href="/profile"
        className="flex items-center gap-2 rounded-full py-1 pl-1 pr-3 transition-colors hover:bg-gray-100"
      >
        <UserAvatar
          name={authUser.username}
          avatarUrl={authUser.avatarUrl}
          className="h-7 w-7 text-xs"
        />
        <span className="hidden text-sm font-medium text-gray-600 sm:inline">
          {formatDisplayName(authUser.username)}
        </span>
      </Link>
      <Button variant="ghost" size="sm" onClick={() => void handleSignOut()} disabled={busy} className="px-2 text-xs sm:px-3 sm:text-sm">
        Sign out
      </Button>
    </div>
  );
}
