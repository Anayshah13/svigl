"use client";

import { UserAvatar } from "@/components/ui/UserAvatar";
import { usePhaseCountdown } from "@/hooks/usePhaseCountdown";
import { formatDisplayName } from "@/lib/names";
import type { Room } from "@/types/room";

export function GameFinishedPanel({ room }: { room: Room }) {
  const { game } = room;
  const remaining = usePhaseCountdown(
    game.phaseEndsAt,
    game.serverTime,
    game.remainingSeconds,
  );
  const scores =
    game.scores.length > 0
      ? game.scores
      : room.players
          .map((p) => ({
            playerId: p.id,
            score: p.score ?? 0,
            roundPoints: 0,
            hasGuessedCorrectly: false,
            isActive: true,
          }))
          .sort((a, b) => b.score - a.score);

  const winnerId = game.winnerId ?? scores[0]?.playerId ?? null;
  const winner = room.players.find((p) => p.id === winnerId);

  return (
    <div className="rounded-3xl border border-plum/15 bg-white/95 px-6 py-8 text-center shadow-sm sm:px-10">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-plum">
        Game over
      </p>
      {winner ? (
        <div className="mt-5 flex flex-col items-center gap-3">
          <UserAvatar
            name={winner.name}
            avatarUrl={winner.avatarUrl}
            className="h-16 w-16 text-xl"
          />
          <h2 className="text-3xl font-bold text-ink">
            {formatDisplayName(winner.name)} wins!
          </h2>
        </div>
      ) : (
        <h2 className="mt-4 text-3xl font-bold text-ink">Final scores</h2>
      )}

      <ol className="mx-auto mt-6 max-w-md space-y-2 text-left">
        {scores.map((entry, index) => {
          const player = room.players.find((p) => p.id === entry.playerId);
          return (
            <li
              key={entry.playerId}
              className="flex items-center justify-between rounded-2xl border border-plum/10 bg-white px-4 py-2.5"
            >
              <span className="flex items-center gap-3 text-sm font-semibold text-ink">
                <span className="w-5 text-ink-muted">{index + 1}</span>
                {formatDisplayName(player?.name ?? "Player")}
              </span>
              <span className="font-mono text-sm font-bold tabular-nums text-ink">
                {entry.score}
              </span>
            </li>
          );
        })}
      </ol>

      <p className="mt-6 text-sm text-ink-muted">
        Returning to lobby
        {remaining !== null ? ` in ${remaining}s` : "…"} — ready up to play again.
      </p>
    </div>
  );
}
