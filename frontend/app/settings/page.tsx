"use client";

import Link from "next/link";
import { FadeIn } from "@/components/motion/FadeIn";
import { AuthControls } from "@/components/auth/AuthControls";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { useSessionStore } from "@/stores/session";

export default function SettingsPage() {
  const displayName = useSessionStore((s) => s.displayName);
  const setDisplayName = useSessionStore((s) => s.setDisplayName);
  const authUser = useSessionStore((s) => s.authUser);
  const authReady = useSessionStore((s) => s.authReady);

  return (
    <div className="page-shell page-shell-narrow gap-6 sm:gap-8">
      <FadeIn>
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-plum">Preferences</p>
          <h1 className="mt-1 text-[clamp(1.65rem,5vw,1.875rem)] font-bold text-ink sm:mt-2 sm:text-3xl">Settings</h1>
          <p className="mt-1 text-sm text-ink-muted sm:mt-2">
            Your display name and account. Saved locally in your browser.
          </p>
        </div>
      </FadeIn>

      <FadeIn delay={0.05}>
        <Card className="flex flex-col gap-5">
          <h2 className="text-sm font-bold uppercase tracking-wider text-plum">Profile</h2>
          <div>
            <label htmlFor="settings-name" className="text-sm font-semibold text-ink">
              Display name
            </label>
            <Input
              id="settings-name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Anonymous artist"
              maxLength={24}
              className="mt-2"
            />
            <p className="mt-2 text-xs text-ink-muted">
              Shown on your profile page and in the gallery when browsing your work.
            </p>
          </div>
          {authReady && (
            <div className="flex flex-col gap-3 rounded-xl border border-plum/10 bg-plum-light/40 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-ink">Account</p>
                <p className="truncate text-xs text-ink-muted">
                  {authUser ? `Signed in as ${authUser.username}` : "Not signed in"}
                </p>
              </div>
              <div className="shrink-0">
                <AuthControls />
              </div>
            </div>
          )}
        </Card>
      </FadeIn>

      <FadeIn delay={0.1}>
        <Card className="flex flex-col gap-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-ink">Navigation</h2>
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <Link href="/gallery" className="w-full sm:w-auto">
              <Button variant="outline" size="sm" className="w-full sm:w-auto">
                Open gallery
              </Button>
            </Link>
            <Link href="/profile" className="w-full sm:w-auto">
              <Button variant="outline" size="sm" className="w-full sm:w-auto">
                View profile
              </Button>
            </Link>
            <Link
              href="/"
              className="inline-flex h-11 w-full items-center justify-center rounded-full px-4 text-sm font-semibold text-ink hover:bg-plum-light/60 sm:h-9 sm:w-auto"
            >
              Back to home
            </Link>
          </div>
        </Card>
      </FadeIn>
    </div>
  );
}
