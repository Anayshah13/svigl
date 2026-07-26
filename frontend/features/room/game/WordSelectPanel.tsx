"use client";

import { Button } from "@/components/ui/Button";
import { DotPulseGrid } from "@/features/loaders";
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
        <div className="mt-5 flex justify-center">
          <DotPulseGrid size="md" />
        </div>
        <h2 className="mt-5 text-2xl font-bold text-ink">
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
    <div className="rounded-3xl border border-plum/15 bg-white px-4 py-5 text-center shadow-lg sm:px-10 sm:py-8">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-plum">
        Choose a word
      </p>
      <p className="mt-1.5 text-sm text-ink-muted sm:mt-2">
        Pick one to draw — a random choice is made if time runs out.
      </p>
      <p
        className="mt-3 font-mono text-3xl font-bold tabular-nums text-green sm:mt-4 sm:text-4xl"
        aria-live="polite"
      >
        {remaining ?? "—"}
      </p>

      <div className="mt-4 grid grid-cols-3 gap-2 sm:mt-6 sm:gap-3">
        {choices.length > 0 ? (
          choices.map((word) => (
            <Button
              key={word}
              type="button"
              variant="outline"
              size="sm"
              className="h-11 min-w-0 px-1.5 capitalize sm:h-11 sm:min-w-[9rem] sm:px-5"
              onClick={() => onSelect(word)}
            >
              <span className="truncate">{word}</span>
            </Button>
          ))
        ) : (
          <div className="col-span-3 flex flex-col items-center gap-3">
            <DotPulseGrid size="sm" />
            <p className="text-sm font-medium text-ink-muted">
              Waiting for word choices from the server…
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
