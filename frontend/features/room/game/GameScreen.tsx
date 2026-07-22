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
import { getChatInputPolicy } from "./chatInputPolicy";
import { GameFinishedPanel } from "./GameFinishedPanel";
import { GameTopBar } from "./GameTopBar";
import { GameWhiteboard } from "./GameWhiteboard";
import {
  GuesserOnboarding,
  useGuesserOnboarding,
} from "./GuesserOnboarding";
import { MobileChatSheet } from "./MobileChatSheet";
import { RoundEndPanel } from "./RoundEndPanel";
import { Scoreboard } from "./Scoreboard";
import { WordSelectPanel } from "./WordSelectPanel";

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
  const [mobileChatOpen, setMobileChatOpen] = React.useState(false);
  const guesserOnboarding = useGuesserOnboarding(
    game.phase === "ROUND_ACTIVE" && !isDrawer && !isWaiting,
  );

  const chatPolicy = getChatInputPolicy({
    phase: game.phase,
    hasSelf: Boolean(selfId),
    isDrawer,
    isWaiting,
    hasGuessed,
  });

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
      canSendChat={chatPolicy.canSendChat}
      disabledReason={chatPolicy.disabledReason}
      inputHint={chatPolicy.inputHint}
      onSend={onSendChat}
      className="h-full min-h-0"
      placeholder={chatPolicy.placeholder}
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

      {isWaiting && chatPolicy.waitingBanner ? (
        <p
          role="status"
          className="absolute bottom-3 left-1/2 z-30 max-w-md -translate-x-1/2 rounded-2xl bg-pink-light px-4 py-2.5 text-center text-sm font-semibold text-plum shadow-sm"
        >
          {chatPolicy.waitingBanner}
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
              currentTurn={game.currentTurn}
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
              currentTurn={game.currentTurn}
              className="min-h-0 flex-1"
              fill
            />
          )}
          {overlays}
          {guesserOnboarding.visible ? (
            <GuesserOnboarding onDismiss={guesserOnboarding.dismiss} />
          ) : null}
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
