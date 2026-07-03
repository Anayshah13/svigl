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
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-6 py-10">
      <FadeIn>
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-plum">Preferences</p>
          <h1 className="mt-2 text-3xl font-bold text-ink">Settings</h1>
          <p className="mt-2 text-sm text-ink-muted">
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
            <div className="flex items-center justify-between rounded-xl border border-plum/10 bg-plum-light/40 px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-ink">Account</p>
                <p className="text-xs text-ink-muted">
                  {authUser ? `Signed in as ${authUser.username}` : "Not signed in"}
                </p>
              </div>
              <AuthControls />
            </div>
          )}
        </Card>
      </FadeIn>

      <FadeIn delay={0.1}>
        <Card className="flex flex-col gap-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-ink">Navigation</h2>
          <div className="flex flex-wrap gap-3">
            <Link href="/gallery">
              <Button variant="outline" size="sm">
                Open gallery
              </Button>
            </Link>
            <Link href="/profile">
              <Button variant="outline" size="sm">
                View profile
              </Button>
            </Link>
            <Link
              href="/"
              className="inline-flex h-9 items-center rounded-full px-4 text-sm font-semibold text-ink hover:bg-plum-light/60"
            >
              Back to home
            </Link>
          </div>
        </Card>
      </FadeIn>
    </div>
  );
}
