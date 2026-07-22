"use client";

import * as React from "react";
import type { ReactNode } from "react";
import { DotPulseGrid } from "@/features/loaders";
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
          "font-mono font-bold tabular-nums text-green",
          compact ? "text-2xl sm:text-3xl" : "text-2xl sm:text-4xl",
        )}
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

function MobileChatSheet({
  open,
  onClose,
  children,
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="absolute inset-0 z-40 flex flex-col justify-end lg:hidden">
      <button
        type="button"
        aria-label="Close chat"
        className="absolute inset-0 bg-ink/35"
        onClick={onClose}
      />
      <div className="relative z-10 max-h-[55%] min-h-[14rem] overflow-hidden rounded-t-3xl border border-plum/15 bg-white shadow-lg">
        {children}
      </div>
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
  const [mobileChatOpen, setMobileChatOpen] = React.useState(false);

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

  const chatPanel = (
    <ChatPanel
      messages={messages}
      canGuess={canChat}
      disabledReason={chatDisabledReason}
      onSend={onSendChat}
      className="h-full min-h-0"
      placeholder={
        hasGuessed
          ? "Chat with other guessers…"
          : "Type your guess here..."
      }
    />
  );

  const overlays = (
    <>
      {game.phase === "COUNTDOWN" ? (
        <OverlayScrim>
          <div className="rounded-3xl border border-plum/15 bg-white px-8 py-10 text-center shadow-lg">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-plum">
              {remaining === 0 ? "Starting" : "Get ready"}
            </p>
            {remaining === 0 ? (
              <div className="mt-5 flex justify-center">
                <DotPulseGrid size="md" />
              </div>
            ) : (
              <p
                className="mt-3 text-7xl font-bold tabular-nums text-ink"
                aria-live="polite"
              >
                {remaining ?? "—"}
              </p>
            )}
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
    </>
  );

  // ── Drawer shell: canvas hero + tool docks; no disabled-control guesser UI ──
  if (canDraw) {
    return (
      <div
        className={cn(
          "grid min-h-0 w-full flex-1 gap-2 overflow-hidden sm:gap-3",
          "grid-rows-1",
          "lg:grid-cols-[12.5rem_minmax(0,1fr)]",
          "xl:grid-cols-[13.5rem_minmax(0,1fr)]",
        )}
      >
        <Scoreboard
          room={room}
          currentPlayerId={selfId}
          className="hidden min-h-0 lg:flex lg:order-1"
          voteTallies={voteTallies}
          onVoteKick={onVoteKick}
        />

        <section className="relative order-1 flex min-h-0 min-w-0 flex-col lg:order-2">
          {game.phase === "GAME_FINISHED" ? (
            <CanvasStage className="flex items-center justify-center bg-white/95 p-4">
              <GameFinishedPanel room={room} />
            </CanvasStage>
          ) : (
            <GameWhiteboard
              playerId={selfId ?? "spectator"}
              isDrawer
              sessionId={game.sessionId}
              roundNumber={game.roundNumber}
              className="min-h-0 flex-1"
              fill
              headerInfo={
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <GameTopBar
                    room={room}
                    isDrawer
                    hasGuessed={hasGuessed}
                    remaining={remaining}
                    drawerName={drawerName}
                    compact
                  />
                  <button
                    type="button"
                    className="min-h-11 rounded-xl border border-plum/15 bg-white px-3 text-xs font-semibold text-plum lg:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-plum/40"
                    onClick={() => setMobileChatOpen(true)}
                  >
                    Activity
                  </button>
                </div>
              }
              aside={chatPanel}
            />
          )}
          {overlays}
          <MobileChatSheet
            open={mobileChatOpen}
            onClose={() => setMobileChatOpen(false)}
          >
            <div className="flex h-full min-h-[14rem] flex-col gap-2 p-2">
              <Scoreboard
                room={room}
                currentPlayerId={selfId}
                className="max-h-28 shrink-0"
                voteTallies={voteTallies}
                onVoteKick={onVoteKick}
              />
              <div className="min-h-0 flex-1">{chatPanel}</div>
            </div>
          </MobileChatSheet>
        </section>
      </div>
    );
  }

  // ── Guesser / spectator shell: clean board, no drawing chrome ──
  return (
    <div
      className={cn(
        "grid min-h-0 w-full flex-1 gap-2 overflow-hidden sm:gap-3",
        "grid-rows-[minmax(0,1fr)_11.5rem]",
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
              isDrawer={false}
              sessionId={game.sessionId}
              roundNumber={game.roundNumber}
              className="min-h-0 flex-1"
              fill
            />
          )}
          {overlays}
        </div>
      </section>

      <div className="order-2 grid min-h-0 grid-cols-[minmax(0,7.25rem)_minmax(0,1fr)] gap-2 overflow-hidden pb-[max(0.35rem,env(safe-area-inset-bottom,0px))] sm:grid-cols-[minmax(0,9rem)_minmax(0,1fr)] lg:contents lg:pb-0">
        <Scoreboard
          room={room}
          currentPlayerId={selfId}
          className="min-h-0 lg:order-1"
          voteTallies={voteTallies}
          onVoteKick={onVoteKick}
        />
        <div className="min-h-0 lg:order-3">{chatPanel}</div>
      </div>
    </div>
  );
}
