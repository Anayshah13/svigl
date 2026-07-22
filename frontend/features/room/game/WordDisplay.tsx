"use client";

import { DotPulseGrid } from "@/features/loaders";
import { cn } from "@/lib/cn";
import { parseHintSlots } from "@/lib/word-display";
import type { RoomGameState } from "@/types/room";

export function WordDisplay({
  game,
  isDrawer,
  hasGuessed = false,
  className,
}: {
  game: RoomGameState;
  isDrawer: boolean;
  hasGuessed?: boolean;
  /** Kept for call-site compatibility; hints are server-authoritative. */
  roundDurationSeconds?: number;
  className?: string;
}) {
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
      <div className={cn("flex items-center gap-2", className)}>
        <DotPulseGrid size="sm" />
        <p className="text-sm font-medium text-ink-muted">Waiting for your word…</p>
      </div>
    );
  }

  // Correct guessers see the full word filled in (server sends secret / filled hint).
  if (hasGuessed && game.secretWord) {
    const slots = game.secretWord.split("").map((ch) => (ch === " " ? " " : ch));
    return (
      <div
        className={cn("flex flex-wrap items-center justify-center gap-1.5", className)}
        aria-label={`Word: ${game.secretWord}`}
      >
        {slots.map((slot, index) =>
          slot === " " ? (
            <span key={`gap-${index}`} className="w-2" aria-hidden />
          ) : (
            <span
              key={`${index}-${slot}`}
              className="inline-flex h-8 min-w-[1.35rem] items-center justify-center border-b-2 border-green px-1 font-mono text-lg font-bold uppercase text-green sm:h-9 sm:min-w-[1.5rem] sm:text-xl"
            >
              {slot}
            </span>
          ),
        )}
      </div>
    );
  }

  // Server-authoritative progressive hints (letters only when revealed).
  let slots = parseHintSlots(game.wordHint);
  if (slots.length === 0 && game.wordLength) {
    slots = Array.from({ length: game.wordLength }, () => "_");
  }

  if (slots.length === 0) {
    return (
      <div className={cn("flex items-center justify-center gap-2", className)}>
        <DotPulseGrid size="sm" />
        <p className="text-sm font-medium text-ink-muted">Waiting for the word…</p>
      </div>
    );
  }

  return (
    <div
      className={cn("flex flex-wrap items-center justify-center gap-1.5", className)}
      aria-label={`Word hint: ${slots.join(" ")}`}
    >
      {slots.map((slot, index) => {
        const revealed = slot !== "_";
        return (
          <span
            key={`${index}-${slot}`}
            className={cn(
              "inline-flex h-8 min-w-[1.35rem] items-center justify-center border-b-2 px-1 font-mono text-lg font-bold uppercase sm:h-9 sm:min-w-[1.5rem] sm:text-xl",
              revealed ? "border-green text-green" : "border-ink/70 text-ink",
            )}
          >
            {revealed ? slot : "\u00A0"}
          </span>
        );
      })}
    </div>
  );
}
