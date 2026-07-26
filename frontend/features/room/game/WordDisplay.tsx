"use client";

import { DotPulseGrid } from "@/features/loaders";
import { cn } from "@/lib/cn";
import { parseHintSlots } from "@/lib/word-display";
import type { RoomGameState } from "@/types/room";

function letterSize(count: number) {
  if (count >= 14) {
    return {
      box: "h-6 min-w-[1rem] px-0.5 text-sm sm:h-7 sm:min-w-[1.15rem] sm:text-base",
      gap: "gap-1",
    };
  }
  if (count >= 10) {
    return {
      box: "h-7 min-w-[1.15rem] px-0.5 text-base sm:h-8 sm:min-w-[1.35rem] sm:text-lg",
      gap: "gap-1 sm:gap-1.5",
    };
  }
  return {
    box: "h-8 min-w-[1.35rem] px-1 text-lg sm:h-9 sm:min-w-[1.5rem] sm:text-xl",
    gap: "gap-1.5",
  };
}

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
      <div
        className={cn(
          "flex w-full max-w-full flex-col items-center gap-1 sm:items-end",
          className,
        )}
      >
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-plum">
          Draw this
        </p>
        <p
          className="max-w-full break-words text-center font-mono text-lg font-bold uppercase tracking-[0.12em] text-ink sm:text-right sm:text-2xl sm:tracking-[0.28em]"
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
    const size = letterSize(slots.filter((s) => s !== " ").length);
    return (
      <div
        className={cn(
          "flex max-w-full flex-wrap items-center justify-center",
          size.gap,
          className,
        )}
        aria-label={`Word: ${game.secretWord}`}
      >
        {slots.map((slot, index) =>
          slot === " " ? (
            <span key={`gap-${index}`} className="w-2" aria-hidden />
          ) : (
            <span
              key={`${index}-${slot}`}
              className={cn(
                "inline-flex items-center justify-center border-b-2 border-green font-mono font-bold uppercase text-green",
                size.box,
              )}
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

  const size = letterSize(slots.length);

  return (
    <div
      className={cn(
        "flex max-w-full flex-wrap items-center justify-center",
        size.gap,
        className,
      )}
      aria-label={`Word hint: ${slots.join(" ")}`}
    >
      {slots.map((slot, index) => {
        const revealed = slot !== "_";
        return (
          <span
            key={`${index}-${slot}`}
            className={cn(
              "inline-flex items-center justify-center border-b-2 font-mono font-bold uppercase",
              size.box,
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
