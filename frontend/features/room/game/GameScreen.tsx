"use client";

import type { ReactNode } from "react";
import { usePhaseCountdown } from "@/hooks/usePhaseCountdown";
import { useGameChat } from "@/hooks/useGameChat";
import { cn } from "@/lib/cn";
import { formatDisplayName } from "@/lib/names";
import type { Room, RoomPlayer } from "@/types/room";
import type { VoteKickTally } from "@/services/app-websocket";
import { ChatPanel } from "./ChatPanel";
import { GameFinishedPanel } from "./GameFinishedPanel";
import { GameWhiteboard } from "./GameWhiteboard";
import { RoundEndPanel } from "./RoundEndPanel";
import { Scoreboard } from "./Scoreboard";
import { WordDisplay } from "./WordDisplay";
import { WordSelectPanel } from "./WordSelectPanel";

function GameTopBar({
  room,
  isDrawer,
  hasGuessed,
  remaining,
  drawerName,
}: {
  room: Room;
  isDrawer: boolean;
  hasGuessed: boolean;
  remaining: number | null;
  drawerName: string;
}) {
  const { game } = room;
  const showWord =
    game.phase === "ROUND_ACTIVE" ||
    (game.phase === "WORD_SELECTION" &&
      !isDrawer &&
      Boolean(game.wordHint || game.wordLength));

  return (
    <div className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-1.5 rounded-2xl border border-plum/15 bg-white/95 px-2.5 py-2 shadow-sm sm:gap-x-4 sm:px-4 sm:py-2.5">
      <p
        className="font-mono text-2xl font-bold tabular-nums text-green sm:text-4xl"
        aria-live="polite"
      >
        {remaining ?? "—"}
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

      <div className="ml-auto min-w-0 flex-1 basis-full sm:basis-auto">
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

function CanvasStage({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative min-h-0 flex-1 overflow-hidden rounded-2xl border border-plum/15 bg-white shadow-inner",
        className,
      )}
    >
      {children}
    </div>
  );
}

function OverlayScrim({ children }: { children: ReactNode }) {
  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-ink/35 p-4 backdrop-blur-[2px]">
      <div className="max-h-full w-full max-w-lg overflow-y-auto">{children}</div>
    </div>
  );
}

export function GameScreen({
  room,
  currentPlayer,
  isWaiting,
  onSelectWord,
  onSendChat,
  voteTallies,
  onVoteKick,
}: {
  room: Room;
  currentPlayer: RoomPlayer | null;
  isWaiting: boolean;
  onSelectWord: (word: string) => void;
  onSendChat: (text: string) => void;
  voteTallies?: Record<string, VoteKickTally>;
  onVoteKick?: (targetId: string) => void;
}) {
  const { game } = room;
  const selfId = currentPlayer?.id;
  const isDrawer = Boolean(selfId && game.drawer?.id === selfId);
  const hasGuessed = Boolean(
    selfId && game.guessedPlayerIds.includes(selfId),
  );
  const messages = useGameChat(room.code, game.sessionId);
  const remaining = usePhaseCountdown(
    game.phaseEndsAt,
    game.serverTime,
    game.remainingSeconds,
  );

  // Correct guessers may keep chatting (private channel enforced by server).
  const canChat =
    game.phase === "ROUND_ACTIVE" &&
    Boolean(selfId) &&
    !isDrawer &&
    !isWaiting;

  let chatDisabledReason: string | undefined;
  if (game.phase !== "ROUND_ACTIVE") {
    chatDisabledReason =
      game.phase === "WORD_SELECTION"
        ? "Waiting for the drawer to pick a word…"
        : game.phase === "COUNTDOWN"
          ? "Round starting soon…"
          : game.phase === "ROUND_END"
            ? "Round over — next turn soon."
            : game.phase === "GAME_FINISHED"
              ? "Game over."
              : "Guessing is only open during the round.";
  } else if (isWaiting) {
    chatDisabledReason = "Waiting players can watch but not guess.";
  } else if (isDrawer) {
    chatDisabledReason = "You're drawing — chat is disabled.";
  }

  const drawerName = game.drawer
    ? formatDisplayName(game.drawer.name)
    : "Someone";

  const showBoard =
    game.phase === "COUNTDOWN" ||
    game.phase === "WORD_SELECTION" ||
    game.phase === "ROUND_ACTIVE" ||
    game.phase === "ROUND_END" ||
    game.phase === "GAME_FINISHED";

  const canDraw =
    game.phase === "ROUND_ACTIVE" && isDrawer && !isWaiting;

  if (!showBoard) {
    return null;
  }

  return (
    <div
      className={cn(
        "grid min-h-0 w-full flex-1 gap-2 overflow-hidden sm:gap-3",
        // Mobile: canvas on top (1fr), scores|chat strip below (fixed)
        "grid-rows-[minmax(0,1fr)_11.5rem]",
        // Desktop Skribbl: scores | canvas | chat — single viewport, no page scroll
        "lg:grid-rows-1",
        "lg:grid-cols-[13.5rem_minmax(0,1fr)_17.5rem]",
        "xl:grid-cols-[14.5rem_minmax(0,1fr)_19rem]",
      )}
    >
      <section className="order-1 flex min-h-0 min-w-0 flex-col gap-2 lg:order-2">
        <GameTopBar
          room={room}
          isDrawer={isDrawer}
          hasGuessed={hasGuessed}
          remaining={remaining}
          drawerName={drawerName}
        />

        <div className="relative flex min-h-0 flex-1 flex-col">
          {game.phase === "GAME_FINISHED" ? (
            <CanvasStage className="flex items-center justify-center bg-white/95 p-4">
              <GameFinishedPanel room={room} />
            </CanvasStage>
          ) : (
            <GameWhiteboard
              playerId={selfId ?? "spectator"}
              isDrawer={canDraw}
              sessionId={game.sessionId}
              roundNumber={game.roundNumber}
              className="min-h-0 flex-1"
              fill
            />
          )}

          {game.phase === "COUNTDOWN" ? (
            <OverlayScrim>
              <div className="rounded-3xl border border-plum/15 bg-white px-8 py-10 text-center shadow-lg">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-plum">
                  {remaining === 0 ? "Starting" : "Get ready"}
                </p>
                <p
                  className="mt-3 text-7xl font-bold tabular-nums text-ink"
                  aria-live="polite"
                >
                  {remaining === 0 ? "…" : (remaining ?? "—")}
                </p>
                <p className="mt-3 text-sm text-ink-muted">
                  {remaining === 0
                    ? `${drawerName} is about to pick a word`
                    : `Round ${Math.max(1, game.roundNumber)} starts soon${
                        game.drawer ? ` · ${drawerName} draws first` : ""
                      }`}
                </p>
              </div>
            </OverlayScrim>
          ) : null}

          {game.phase === "WORD_SELECTION" ? (
            <OverlayScrim>
              <WordSelectPanel
                game={game}
                isDrawer={isDrawer}
                onSelect={onSelectWord}
              />
            </OverlayScrim>
          ) : null}

          {game.phase === "ROUND_END" ? (
            <OverlayScrim>
              <RoundEndPanel room={room} />
            </OverlayScrim>
          ) : null}

          {isWaiting ? (
            <p
              role="status"
              className="absolute bottom-3 left-1/2 z-30 max-w-sm -translate-x-1/2 rounded-2xl bg-pink-light px-4 py-2.5 text-center text-sm font-semibold text-plum shadow-sm"
            >
              Watching this game — you&apos;ll join the next one.
            </p>
          ) : null}
        </div>
      </section>

      {/* Mobile: scores | chat side-by-side fixed strip; lg:contents promotes children into parent grid */}
      <div className="order-2 grid min-h-0 grid-cols-[minmax(0,7.25rem)_minmax(0,1fr)] gap-2 overflow-hidden pb-[max(0.35rem,env(safe-area-inset-bottom,0px))] sm:grid-cols-[minmax(0,9rem)_minmax(0,1fr)] lg:contents lg:pb-0">
        <Scoreboard
          room={room}
          currentPlayerId={selfId}
          className="min-h-0 lg:order-1"
          voteTallies={voteTallies}
          onVoteKick={onVoteKick}
        />
        <ChatPanel
          messages={messages}
          canGuess={canChat}
          disabledReason={chatDisabledReason}
          onSend={onSendChat}
          className="min-h-0 lg:order-3"
          placeholder={
            hasGuessed
              ? "Chat with other guessers…"
              : "Type your guess here..."
          }
        />
      </div>
    </div>
  );
}
