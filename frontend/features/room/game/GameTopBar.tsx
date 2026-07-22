"use client";

import { cn } from "@/lib/cn";
import type { Room } from "@/types/room";
import { WordDisplay } from "./WordDisplay";

type TimerUrgency = "normal" | "warning" | "critical";

function getTimerUrgency(remaining: number | null): TimerUrgency {
  if (remaining == null) return "normal";
  if (remaining <= 5) return "critical";
  if (remaining <= 10) return "warning";
  return "normal";
}

export function GameTopBar({
  room,
  isDrawer,
  hasGuessed,
  remaining,
  drawerName,
  compact = false,
}: {
  room: Room;
  isDrawer: boolean;
  hasGuessed: boolean;
  remaining: number | null;
  drawerName: string;
  /** Slimmer row when embedded in whiteboard action bar. */
  compact?: boolean;
}) {
  const { game } = room;
  const showWord =
    game.phase === "ROUND_ACTIVE" ||
    (game.phase === "WORD_SELECTION" &&
      !isDrawer &&
      Boolean(game.wordHint || game.wordLength));

  const urgency =
    game.phase === "ROUND_ACTIVE" ? getTimerUrgency(remaining) : "normal";

  return (
    <div
      className={cn(
        "flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1",
        !compact &&
          "rounded-2xl border border-plum/15 bg-white/95 px-2.5 py-2 shadow-sm sm:gap-x-4 sm:px-4 sm:py-2.5",
      )}
    >
      <p
        className={cn(
          "font-mono font-bold tabular-nums transition-colors duration-300",
          compact ? "text-2xl sm:text-3xl" : "text-2xl sm:text-4xl",
          urgency === "critical" &&
            "animate-pulse text-red-600 motion-reduce:animate-none",
          urgency === "warning" && "text-orange-500",
          urgency === "normal" && "text-green",
        )}
        aria-live={urgency === "critical" ? "assertive" : "polite"}
        aria-atomic="true"
      >
        {remaining ?? "—"}
        {urgency !== "normal" && remaining != null ? (
          <span className="sr-only">
            {urgency === "critical"
              ? ` — hurry, only ${remaining} seconds left`
              : ` — ${remaining} seconds left`}
          </span>
        ) : null}
      </p>

      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-wider text-ink-muted sm:text-[11px]">
          Round {Math.max(1, game.roundNumber)} of {game.totalRounds}
        </p>
        <p className="truncate text-xs font-semibold text-ink sm:text-sm">
          {game.phase === "WORD_SELECTION"
            ? isDrawer
              ? "Choose a word"
              : `${drawerName} is choosing`
            : game.phase === "COUNTDOWN"
              ? "Get ready"
              : isDrawer
                ? "You're drawing"
                : `${drawerName} is drawing`}
        </p>
      </div>

      <div className="min-w-0 flex-1 basis-full sm:basis-auto sm:ml-auto">
        {showWord ? (
          <WordDisplay
            game={game}
            isDrawer={isDrawer}
            hasGuessed={hasGuessed}
            roundDurationSeconds={room.settings.roundDurationSeconds}
            className="justify-center sm:justify-end"
          />
        ) : game.phase === "WORD_SELECTION" && isDrawer ? (
          <p className="text-center text-sm font-medium text-ink-muted sm:text-right">
            Pick a word to draw
          </p>
        ) : null}
      </div>
    </div>
  );
}
