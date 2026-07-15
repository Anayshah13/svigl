"use client";

import { usePhaseCountdown } from "@/hooks/usePhaseCountdown";
import { cn } from "@/lib/cn";
import {
  parseHintSlots,
  revealIndices,
  revealSlotCount,
  roundProgress,
} from "@/lib/word-display";
import type { RoomGameState } from "@/types/room";

export function WordDisplay({
  game,
  isDrawer,
  roundDurationSeconds,
  className,
}: {
  game: RoomGameState;
  isDrawer: boolean;
  roundDurationSeconds: number;
  className?: string;
}) {
  const remaining = usePhaseCountdown(
    game.phaseEndsAt,
    game.serverTime,
    game.remainingSeconds,
  );

  if (isDrawer && game.secretWord) {
    return (
      <div className={cn("flex flex-col items-center gap-1 sm:items-end", className)}>
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-plum">
          Draw this
        </p>
        <p
          className="font-mono text-xl font-bold tracking-[0.35em] text-ink sm:text-2xl"
          aria-label={`Your word: ${game.secretWord}`}
        >
          {game.secretWord.toUpperCase()}
        </p>
      </div>
    );
  }

  // Drawer never falls back to dashed word_hint — that leaks "guesser" UI.
  if (isDrawer) {
    return (
      <p className={cn("text-sm font-medium text-ink-muted", className)}>
        Waiting for your word…
      </p>
    );
  }

  let slots = parseHintSlots(game.wordHint);
  if (slots.length === 0 && game.wordLength) {
    slots = Array.from({ length: game.wordLength }, () => "_");
  }

  if (slots.length === 0) {
    return (
      <p className={cn("text-sm font-medium text-ink-muted", className)}>
        Waiting for the word…
      </p>
    );
  }

  const progress = roundProgress(
    game.phaseEndsAt,
    Math.max(1, roundDurationSeconds),
    remaining,
  );
  const hasServerLetters = slots.some((s) => s !== "_");
  const open = hasServerLetters
    ? new Set<number>()
    : revealIndices(
        slots.length,
        revealSlotCount(slots.length, progress),
        `${game.sessionId ?? ""}:${game.roundNumber}:${game.wordLength ?? slots.length}`,
      );

  return (
    <div
      className={cn("flex flex-wrap items-center justify-center gap-1.5", className)}
      aria-label={`Word hint: ${slots.join(" ")}`}
    >
      {slots.map((slot, index) => {
        const revealed = slot !== "_";
        const softOpen = open.has(index);
        return (
          <span
            key={`${index}-${slot}`}
            className={cn(
              "inline-flex h-8 min-w-[1.35rem] items-center justify-center border-b-2 px-1 font-mono text-lg font-bold uppercase sm:h-9 sm:min-w-[1.5rem] sm:text-xl",
              revealed
                ? "border-green text-green"
                : softOpen
                  ? "border-plum/40 text-ink-muted"
                  : "border-ink/70 text-ink",
            )}
          >
            {revealed ? slot : "\u00A0"}
          </span>
        );
      })}
    </div>
  );
}
