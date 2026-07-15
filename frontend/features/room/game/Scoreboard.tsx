"use client";

import { UserAvatar } from "@/components/ui/UserAvatar";
import { cn } from "@/lib/cn";
import { formatDisplayName } from "@/lib/names";
import type { Room, ScoreEntry } from "@/types/room";

function resolveScores(room: Room): ScoreEntry[] {
  if (room.game.scores.length > 0) {
    return room.game.scores;
  }
  return room.players
    .map((player) => ({
      playerId: player.id,
      score: player.score ?? 0,
      roundPoints: 0,
      hasGuessedCorrectly: room.game.guessedPlayerIds.includes(player.id),
      isActive: !room.waitingPlayerIds.includes(player.id),
    }))
    .sort((a, b) => b.score - a.score);
}

export function Scoreboard({
  room,
  currentPlayerId,
  className,
}: {
  room: Room;
  currentPlayerId?: string;
  className?: string;
}) {
  const scores = resolveScores(room);
  const drawerId = room.game.drawer?.id;

  return (
    <aside
      className={cn(
        "flex h-full min-h-[12rem] flex-col overflow-hidden rounded-3xl border border-plum/15 bg-white/90 lg:min-h-0",
        className,
      )}
    >
      <div className="border-b border-plum/10 px-4 py-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-ink-muted">
          Scores
        </h2>
      </div>
      <ol className="flex-1 space-y-1 overflow-y-auto p-2">
        {scores.map((entry, index) => {
          const player = room.players.find((p) => p.id === entry.playerId);
          const name = player?.name ?? "Player";
          const isSelf = entry.playerId === currentPlayerId;
          const isDrawer = entry.playerId === drawerId;
          const guessed = entry.hasGuessedCorrectly;

          return (
            <li
              key={entry.playerId}
              className={cn(
                "flex items-center gap-2.5 rounded-2xl px-2.5 py-2",
                guessed ? "bg-green-light/60" : "hover:bg-plum-light/40",
                isSelf && "ring-1 ring-plum/20",
              )}
            >
              <span className="w-5 text-center text-xs font-bold text-ink-muted">
                {index + 1}
              </span>
              <UserAvatar
                name={name}
                avatarUrl={player?.avatarUrl ?? null}
                className="h-8 w-8 shrink-0 text-xs"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-ink">
                  {formatDisplayName(name)}
                  {isDrawer ? (
                    <span className="ml-1.5 text-[10px] font-bold uppercase tracking-wide text-plum">
                      Drawing
                    </span>
                  ) : null}
                  {guessed ? (
                    <span className="ml-1.5 text-[10px] font-bold uppercase tracking-wide text-green">
                      Got it
                    </span>
                  ) : null}
                </p>
                {!entry.isActive ? (
                  <p className="text-[11px] font-medium text-ink-muted">Waiting</p>
                ) : entry.roundPoints > 0 ? (
                  <p className="text-[11px] font-medium text-green">
                    +{entry.roundPoints} this turn
                  </p>
                ) : null}
              </div>
              <span className="shrink-0 font-mono text-sm font-bold tabular-nums text-ink">
                {entry.score}
              </span>
            </li>
          );
        })}
      </ol>
    </aside>
  );
}
