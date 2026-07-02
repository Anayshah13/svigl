"use client";

import Link from "next/link";
import { FadeIn } from "@/components/motion/FadeIn";
import { AuthControls } from "@/components/auth/AuthControls";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { useSessionStore } from "@/stores/session";
import { usePreferencesStore } from "@/stores/preferences";

function Toggle({
  id,
  label,
  description,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <label htmlFor={id} className="text-sm font-semibold text-ink">
          {label}
        </label>
        <p className="mt-0.5 text-xs text-ink-muted">{description}</p>
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${
          checked ? "bg-plum" : "bg-gray-200"
        }`}
      >
        <span
          className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${
            checked ? "translate-x-5" : "translate-x-0.5"
          }`}
        />
      </button>
    </div>
  );
}

const SHORTCUTS = [
  { keys: "V", action: "Select / pointer tool" },
  { keys: "P", action: "Path (pen) tool" },
  { keys: "R", action: "Rectangle tool" },
  { keys: "O", action: "Circle / ellipse tool" },
  { keys: "⌘ Z", action: "Undo last shape" },
  { keys: "Enter", action: "Send guess or chat message" },
];

export default function SettingsPage() {
  const displayName = useSessionStore((s) => s.displayName);
  const setDisplayName = useSessionStore((s) => s.setDisplayName);
  const authUser = useSessionStore((s) => s.authUser);
  const authReady = useSessionStore((s) => s.authReady);

  const soundEffects = usePreferencesStore((s) => s.soundEffects);
  const showPlayerCursors = usePreferencesStore((s) => s.showPlayerCursors);
  const showChatTimestamps = usePreferencesStore((s) => s.showChatTimestamps);
  const compactChat = usePreferencesStore((s) => s.compactChat);
  const defaultStrokeWidth = usePreferencesStore((s) => s.defaultStrokeWidth);
  const setSoundEffects = usePreferencesStore((s) => s.setSoundEffects);
  const setShowPlayerCursors = usePreferencesStore((s) => s.setShowPlayerCursors);
  const setShowChatTimestamps = usePreferencesStore((s) => s.setShowChatTimestamps);
  const setCompactChat = usePreferencesStore((s) => s.setCompactChat);
  const setDefaultStrokeWidth = usePreferencesStore((s) => s.setDefaultStrokeWidth);
  const resetPreferences = usePreferencesStore((s) => s.resetPreferences);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-6 py-10">
      <FadeIn>
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-plum">Preferences</p>
          <h1 className="mt-2 text-3xl font-bold text-ink">Settings</h1>
          <p className="mt-2 text-sm text-ink-muted">
            Your name, game feel, and drawing defaults. Saved locally in your browser.
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
              Shown in rooms, on the leaderboard, and when you publish to the gallery.
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
        <Card className="flex flex-col gap-5">
          <h2 className="text-sm font-bold uppercase tracking-wider text-plum">Game</h2>
          <Toggle
            id="sound"
            label="Sound effects"
            description="Timer ticks, correct guess chimes, and round-end fanfare."
            checked={soundEffects}
            onChange={setSoundEffects}
          />
          <Toggle
            id="cursors"
            label="Show player cursors"
            description="See where other players are pointing on the canvas."
            checked={showPlayerCursors}
            onChange={setShowPlayerCursors}
          />
          <Toggle
            id="timestamps"
            label="Chat timestamps"
            description="Show time on each guess and chat message."
            checked={showChatTimestamps}
            onChange={setShowChatTimestamps}
          />
          <Toggle
            id="compact"
            label="Compact chat"
            description="Tighter spacing in the guess feed during rounds."
            checked={compactChat}
            onChange={setCompactChat}
          />
        </Card>
      </FadeIn>

      <FadeIn delay={0.15}>
        <Card className="flex flex-col gap-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-plum">Drawing</h2>
          <div>
            <label htmlFor="stroke-width" className="text-sm font-semibold text-ink">
              Default stroke width
            </label>
            <p className="mt-0.5 text-xs text-ink-muted">
              Applied when you join a room as the drawer.
            </p>
            <div className="mt-3 flex gap-2">
              {([2, 4, 6] as const).map((w) => (
                <button
                  key={w}
                  type="button"
                  onClick={() => setDefaultStrokeWidth(w)}
                  className={`flex h-10 w-10 items-center justify-center rounded-xl text-sm font-bold transition-colors ${
                    defaultStrokeWidth === w
                      ? "bg-plum text-white"
                      : "border border-plum/20 bg-white text-ink hover:bg-plum-light"
                  }`}
                >
                  {w}
                </button>
              ))}
            </div>
          </div>
        </Card>
      </FadeIn>

      <FadeIn delay={0.2}>
        <Card className="flex flex-col gap-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-plum">Keyboard shortcuts</h2>
          <ul className="divide-y divide-plum/10">
            {SHORTCUTS.map(({ keys, action }) => (
              <li key={keys} className="flex items-center justify-between py-2.5 text-sm">
                <span className="text-ink-muted">{action}</span>
                <kbd className="rounded-lg border border-plum/15 bg-white px-2 py-1 font-mono text-xs font-semibold text-ink">
                  {keys}
                </kbd>
              </li>
            ))}
          </ul>
        </Card>
      </FadeIn>

      <FadeIn delay={0.25}>
        <Card className="flex flex-col gap-4 border-red-100">
          <h2 className="text-sm font-bold uppercase tracking-wider text-ink">Data</h2>
          <p className="text-xs text-ink-muted">
            Resets toggles and stroke width. Does not affect your account.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" size="sm" onClick={resetPreferences}>
              Reset preferences
            </Button>
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
