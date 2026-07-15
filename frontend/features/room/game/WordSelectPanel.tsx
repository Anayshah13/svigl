"use client";

import { Button } from "@/components/ui/Button";
import { usePhaseCountdown } from "@/hooks/usePhaseCountdown";
import { formatDisplayName } from "@/lib/names";
import type { RoomGameState } from "@/types/room";

export function WordSelectPanel({
  game,
  isDrawer,
  onSelect,
}: {
  game: RoomGameState;
  isDrawer: boolean;
  onSelect: (word: string) => void;
}) {
  const remaining = usePhaseCountdown(
    game.phaseEndsAt,
    game.serverTime,
    game.remainingSeconds,
  );
  const choices = game.wordChoices ?? [];
  const drawerName = game.drawer
    ? formatDisplayName(game.drawer.name)
    : "The drawer";

  if (!isDrawer) {
    return (
      <div className="rounded-3xl border border-plum/15 bg-white px-6 py-10 text-center shadow-lg sm:px-10">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-plum">
          Word selection
        </p>
        <h2 className="mt-3 text-2xl font-bold text-ink">
          Drawer is picking a word…
        </h2>
        <p className="mt-2 text-sm font-medium text-ink-muted">
          {drawerName} is choosing what to draw
        </p>
        <p
          className="mt-4 font-mono text-5xl font-bold tabular-nums text-green"
          aria-live="polite"
        >
          {remaining ?? "—"}
        </p>
        <p className="mt-3 text-sm text-ink-muted">
          Drawing starts as soon as they pick.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-plum/15 bg-white px-6 py-8 text-center shadow-lg sm:px-10">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-plum">
        Choose a word
      </p>
      <p className="mt-2 text-sm text-ink-muted">
        Pick one to draw — a random choice is made if time runs out.
      </p>
      <p
        className="mt-4 font-mono text-4xl font-bold tabular-nums text-green"
        aria-live="polite"
      >
        {remaining ?? "—"}
      </p>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-center">
        {choices.length > 0 ? (
          choices.map((word) => (
            <Button
              key={word}
              type="button"
              variant="outline"
              className="min-w-[9rem] capitalize"
              onClick={() => onSelect(word)}
            >
              {word}
            </Button>
          ))
        ) : (
          <p className="text-sm font-medium text-ink-muted">
            Waiting for word choices from the server…
          </p>
        )}
      </div>
    </div>
  );
}
