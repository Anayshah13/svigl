"use client";

import { cn } from "@/lib/cn";
import type { Room } from "@/types/room";
import { MobileGameMenu } from "./MobileGameMenu";
import { WordDisplay } from "./WordDisplay";

type TimerUrgency = "normal" | "warning" | "critical";

function getTimerUrgency(remaining: number | null): TimerUrgency {
  if (remaining == null) return "normal";
  if (remaining <= 5) return "critical";
  if (remaining <= 10) return "warning";
  return "normal";
}

interface MenuAction {
  id: string;
  label: string;
  onSelect: () => void;
  tone?: "default" | "danger";
}

/**
 * Compact top chrome for mobile game routes.
 * Timer + menu stay on the first row; the guess word gets a full-width
 * second row so long hints never collapse into “…”.
 */
export function MobileGameHeader({
  room,
  isDrawer,
  hasGuessed,
  remaining,
  drawerName,
  menuActions,
  className,
}: {
  room: Room;
  isDrawer: boolean;
  hasGuessed: boolean;
  remaining: number | null;
  drawerName: string;
  menuActions: MenuAction[];
  className?: string;
}) {
  const { game } = room;
  const urgency =
    game.phase === "ROUND_ACTIVE" ? getTimerUrgency(remaining) : "normal";

  const showWord =
    game.phase === "ROUND_ACTIVE" ||
    (game.phase === "WORD_SELECTION" &&
      !isDrawer &&
      Boolean(game.wordHint || game.wordLength));

  const statusLabel =
    game.phase === "WORD_SELECTION"
      ? isDrawer
        ? "Choose a word"
        : `${drawerName} is choosing`
      : game.phase === "COUNTDOWN"
        ? "Get ready…"
        : isDrawer
          ? "You're drawing"
          : `${drawerName} is drawing`;

  return (
    <header
      className={cn(
        "flex shrink-0 flex-col gap-1.5 rounded-2xl border border-plum/15 bg-white/95 px-2 py-1.5 shadow-sm",
        className,
      )}
    >
      <div className="flex items-center gap-2">
        <div className="flex shrink-0 items-baseline gap-1.5">
          <span
            className={cn(
              "font-mono text-2xl font-bold tabular-nums transition-colors duration-300",
              urgency === "critical" &&
                "animate-pulse text-red-600 motion-reduce:animate-none",
              urgency === "warning" && "text-orange-500",
              urgency === "normal" && "text-green",
            )}
            aria-live={urgency === "critical" ? "assertive" : "polite"}
            aria-atomic="true"
          >
            {remaining ?? "—"}
          </span>
          <span className="text-[10px] font-bold uppercase tracking-wider text-ink-muted">
            R{Math.max(1, game.roundNumber)}/{game.totalRounds}
          </span>
        </div>

        {!showWord ? (
          <p className="min-w-0 flex-1 text-center text-xs font-semibold leading-snug text-ink">
            {statusLabel}
          </p>
        ) : (
          <div className="min-w-0 flex-1" aria-hidden />
        )}

        <MobileGameMenu actions={menuActions} className="shrink-0" />
      </div>

      {showWord ? (
        <WordDisplay
          game={game}
          isDrawer={isDrawer}
          hasGuessed={hasGuessed}
          roundDurationSeconds={room.settings.roundDurationSeconds}
          className="w-full items-center justify-center"
        />
      ) : null}
    </header>
  );
}
