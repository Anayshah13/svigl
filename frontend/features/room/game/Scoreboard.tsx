"use client";

import { UserAvatar } from "@/components/ui/UserAvatar";
import { cn } from "@/lib/cn";
import { formatDisplayName } from "@/lib/names";
import type { VoteKickTally } from "@/services/app-websocket";
import type { Room, ScoreEntry } from "@/types/room";
import { VoteKickButton } from "../VoteKickButton";

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
  voteTallies,
  onVoteKick,
}: {
  room: Room;
  currentPlayerId?: string;
  className?: string;
  voteTallies?: Record<string, VoteKickTally>;
  onVoteKick?: (targetId: string) => void;
}) {
  const scores = resolveScores(room);
  const drawerId = room.game.drawer?.id;
  const playerCount = room.players.length;
  const canVoteKickDrawer =
    onVoteKick != null &&
    room.game.phase === "ROUND_ACTIVE" &&
    drawerId != null;

  return (
    <aside
      className={cn(
        "flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-plum/15 bg-white/90 sm:rounded-3xl",
        className,
      )}
    >
      <div className="shrink-0 border-b border-plum/10 px-2.5 py-2 sm:px-4 sm:py-3">
        <h2 className="text-[10px] font-bold uppercase tracking-wider text-ink-muted sm:text-xs">
          Scores
        </h2>
      </div>
      <ol className="min-h-0 flex-1 space-y-0.5 overflow-y-auto overscroll-contain p-1.5 sm:space-y-1 sm:p-2">
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
                "flex items-center gap-1.5 rounded-xl px-1.5 py-1.5 sm:gap-2.5 sm:rounded-2xl sm:px-2.5 sm:py-2",
                guessed ? "bg-green-light/60" : "hover:bg-plum-light/40",
                isSelf && "ring-1 ring-plum/20",
              )}
            >
              <span className="hidden w-5 text-center text-xs font-bold text-ink-muted sm:block">
                {index + 1}
              </span>
              <UserAvatar
                name={name}
                avatarUrl={player?.avatarUrl ?? null}
                className="h-7 w-7 shrink-0 text-[10px] sm:h-8 sm:w-8 sm:text-xs"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-ink sm:text-sm">
                  {formatDisplayName(name)}
                  {isDrawer ? (
                    <span className="ml-1 hidden text-[10px] font-bold uppercase tracking-wide text-plum sm:inline">
                      Drawing
                    </span>
                  ) : null}
                  {guessed ? (
                    <span className="ml-1 hidden text-[10px] font-bold uppercase tracking-wide text-green sm:inline">
                      Got it
                    </span>
                  ) : null}
                </p>
                {!entry.isActive ? (
                  <p className="hidden text-[11px] font-medium text-ink-muted sm:block">
                    Waiting
                  </p>
                ) : entry.roundPoints > 0 ? (
                  <p className="hidden text-[11px] font-medium text-green sm:block">
                    +{entry.roundPoints} this turn
                  </p>
                ) : null}
              </div>
              {canVoteKickDrawer && isDrawer && !isSelf && onVoteKick ? (
                <VoteKickButton
                  targetId={entry.playerId}
                  selfId={currentPlayerId}
                  playerCount={playerCount}
                  tally={voteTallies?.[entry.playerId]}
                  onToggle={onVoteKick}
                  compact
                />
              ) : null}
              <span className="shrink-0 font-mono text-xs font-bold tabular-nums text-ink sm:text-sm">
                {entry.score}
              </span>
            </li>
          );
        })}
      </ol>
    </aside>
  );
}
