"use client";

import * as React from "react";
import type { ReactNode } from "react";
import { ReactionBar } from "@/components/reactions/ReactionBar";
import { DotPulseGrid } from "@/features/loaders";
import { useDrawingReactions } from "@/hooks/useDrawingReactions";
import { usePhaseCountdown } from "@/hooks/usePhaseCountdown";
import { useGameChat } from "@/hooks/useGameChat";
import { AnalyticsEvents, trackEvent } from "@/lib/analytics";
import { cn } from "@/lib/cn";
import { formatDisplayName } from "@/lib/names";
import { shareRoomInvite } from "@/lib/room-invite";
import type { VoteKickTally } from "@/services/app-websocket";
import type { ChatMessage, Room, RoomPlayer } from "@/types/room";
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
import { MobileGameHeader } from "./MobileGameHeader";
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
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-ink/35 p-3 backdrop-blur-[2px] sm:p-4">
      <div className="max-h-full w-full max-w-lg overflow-y-auto overscroll-contain">
        {children}
      </div>
    </div>
  );
}

export function GameScreen({
  room,
  currentPlayer,
  onSelectWord,
  onSendChat,
  voteTallies,
  onVoteKick,
  onLeaveRoom,
  leaving,
  /** Demo/layout: skip canvas WS sync (local drawing still works). */
  localCanvas = false,
  /** Demo/layout: drive chat from props instead of the live WS feed. */
  chatMessages,
  /** Demo/layout: hide guesser onboarding overlay. */
  disableOnboarding = false,
}: {
  room: Room;
  currentPlayer: RoomPlayer | null;
  onSelectWord: (word: string) => void;
  onSendChat: (text: string) => void;
  voteTallies?: Record<string, VoteKickTally>;
  onVoteKick?: (targetId: string) => void;
  /** Leaves the current room; wired from useRoom. */
  onLeaveRoom?: () => Promise<void> | void;
  /** True while a leave request is in flight (disables the menu item). */
  leaving?: boolean;
  localCanvas?: boolean;
  chatMessages?: ChatMessage[];
  disableOnboarding?: boolean;
}) {
  const { game } = room;
  const selfId = currentPlayer?.id;
  const isDrawer = Boolean(selfId && game.drawer?.id === selfId);
  const hasGuessed = Boolean(
    selfId && game.guessedPlayerIds.includes(selfId),
  );
  const liveMessages = useGameChat(room.code, game.sessionId);
  const messages = chatMessages ?? liveMessages;
  const remaining = usePhaseCountdown(
    game.phaseEndsAt,
    game.serverTime,
    game.remainingSeconds,
  );
  const [mobileChatOpen, setMobileChatOpen] = React.useState(false);
  const guesserOnboarding = useGuesserOnboarding(
    !disableOnboarding && game.phase === "ROUND_ACTIVE" && !isDrawer,
  );

  const reactions = useDrawingReactions(room.code, game.phase, {
    drawingId: game.drawingId,
    likes: game.likes,
    dislikes: game.dislikes,
    myReaction: game.myReaction,
  });

  const showReactions =
    !isDrawer &&
    Boolean(reactions.drawingId) &&
    (game.phase === "ROUND_ACTIVE" || game.phase === "ROUND_END");

  const reactionControls = showReactions ? (
    <ReactionBar
      likes={reactions.likes}
      dislikes={reactions.dislikes}
      myReaction={reactions.myReaction}
      onReact={reactions.setReaction}
      size="sm"
    />
  ) : null;

  const chatPolicy = getChatInputPolicy({
    phase: game.phase,
    hasSelf: Boolean(selfId),
    isDrawer,
    hasGuessed,
  });

  const handleSendChat = React.useCallback(
    (text: string) => {
      // Intent to guess while scoring is open (not private chat / idle chat).
      if (chatPolicy.canScoreGuess) {
        trackEvent(AnalyticsEvents.PLAYER_GUESSED, {
          room_code: room.code,
          round: game.roundNumber,
        });
      }
      onSendChat(text);
    },
    [chatPolicy.canScoreGuess, game.roundNumber, onSendChat, room.code],
  );

  const drawerName = game.drawer
    ? formatDisplayName(game.drawer.name)
    : "Someone";

  const showBoard =
    game.phase === "COUNTDOWN" ||
    game.phase === "WORD_SELECTION" ||
    game.phase === "ROUND_ACTIVE" ||
    game.phase === "ROUND_END" ||
    game.phase === "GAME_FINISHED";

  const canDraw = game.phase === "ROUND_ACTIVE" && isDrawer;

  const mobileMenuActions = React.useMemo(
    () => {
      const actions: Array<{
        id: string;
        label: string;
        onSelect: () => void;
        tone?: "default" | "danger";
      }> = [
        {
          id: "activity",
          label: "Scores & chat",
          onSelect: () => setMobileChatOpen(true),
        },
        {
          id: "invite",
          label: "Invite friends",
          onSelect: () => void shareRoomInvite(room.code),
        },
      ];
      if (onLeaveRoom) {
        actions.push({
          id: "leave",
          label: leaving ? "Leaving…" : "Leave game",
          tone: "danger",
          onSelect: () => void onLeaveRoom(),
        });
      }
      return actions;
    },
    [leaving, onLeaveRoom, room.code],
  );

  if (!showBoard) {
    return null;
  }

  const chatPanel = (
    <ChatPanel
      messages={messages}
      canSendChat={chatPolicy.canSendChat}
      disabledReason={chatPolicy.disabledReason}
      inputHint={chatPolicy.inputHint}
      onSend={handleSendChat}
      className="h-full min-h-0"
      placeholder={chatPolicy.placeholder}
    />
  );

  // Mobile drawer strip during ROUND_ACTIVE: read-only (drawer can't type while drawing).
  const drawerMobileChatPanel = (
    <ChatPanel
      messages={messages}
      canSendChat={false}
      disabledReason={chatPolicy.disabledReason}
      onSend={handleSendChat}
      className="h-full min-h-0"
      hideInput
      hideHeader
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
    </>
  );

  const mobileHeader = (
    <MobileGameHeader
      room={room}
      isDrawer={isDrawer}
      hasGuessed={hasGuessed}
      remaining={remaining}
      drawerName={drawerName}
      menuActions={mobileMenuActions}
    />
  );

  // ── Drawer shell: canvas hero + tool docks; no disabled-control guesser UI ──
  if (canDraw) {
    return (
      <div
        className={cn(
          "grid min-h-0 w-full flex-1 gap-2 overflow-hidden sm:gap-3",
          // Mobile: board on top, scores+chat strip below (same as guesser).
          "grid-rows-[minmax(0,1fr)_minmax(10rem,30%)]",
          "lg:grid-rows-1",
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

        <section className="relative order-1 flex min-h-0 min-w-0 flex-col gap-1.5 lg:order-2 lg:gap-0">
          {/* Mobile-only compact header: timer · word · settings menu */}
          <div className="lg:hidden">{mobileHeader}</div>

          {game.phase === "GAME_FINISHED" ? (
            <CanvasStage className="flex items-center justify-center bg-white/95 p-4">
              <GameFinishedPanel room={room} />
            </CanvasStage>
          ) : (
            <div className="relative min-h-0 flex-1">
              <GameWhiteboard
                playerId={selfId ?? "spectator"}
                isDrawer
                sessionId={game.sessionId}
                currentTurn={game.currentTurn}
                className="min-h-0 h-full flex-1"
                fill
                localOnly={localCanvas}
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
                  </div>
                }
                aside={chatPanel}
              />
            </div>
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

        {/*
          Mobile bottom strip: scores + chat side-by-side (mirrors guesser).
          Read-only while drawing; after the round the guesser shell is used instead.
        */}
        <div className="order-2 grid min-h-0 grid-cols-[minmax(0,7.25rem)_minmax(0,1fr)] gap-2 overflow-hidden pb-[max(0.35rem,env(safe-area-inset-bottom,0px))] sm:grid-cols-[minmax(0,9rem)_minmax(0,1fr)] lg:hidden lg:pb-0">
          <Scoreboard
            room={room}
            currentPlayerId={selfId}
            className="min-h-0"
            voteTallies={voteTallies}
            onVoteKick={onVoteKick}
          />
          <div className="min-h-0">{drawerMobileChatPanel}</div>
        </div>
      </div>
    );
  }

  // ── Guesser / spectator shell: clean board, no drawing chrome ──
  return (
    <div
      className={cn(
        "grid min-h-0 w-full flex-1 gap-2 overflow-hidden sm:gap-3",
        "grid-rows-[auto_minmax(0,1fr)_auto]",
        "lg:grid-rows-1",
        "lg:grid-cols-[13.5rem_minmax(0,1fr)_17.5rem]",
        "xl:grid-cols-[14.5rem_minmax(0,1fr)_19rem]",
      )}
    >
      <section className="order-1 flex min-h-0 min-w-0 flex-col gap-2 lg:order-2">
        {/* Desktop keeps the roomy top bar; mobile uses the compact header */}
        <div className="hidden min-w-0 lg:block">
          <GameTopBar
            room={room}
            isDrawer={isDrawer}
            hasGuessed={hasGuessed}
            remaining={remaining}
            drawerName={drawerName}
          />
        </div>
        <div className="lg:hidden">{mobileHeader}</div>

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
              localOnly={localCanvas}
            />
          )}
          {/* Guesser-only: float reactions on the canvas to free header space */}
          {reactionControls ? (
            <div className="pointer-events-none absolute inset-x-0 top-2 z-10 flex justify-center px-2 sm:top-3">
              <div className="pointer-events-auto">{reactionControls}</div>
            </div>
          ) : null}
          {overlays}
          {guesserOnboarding.visible ? (
            <GuesserOnboarding onDismiss={guesserOnboarding.dismiss} />
          ) : null}
        </div>
      </section>

      {/*
        Mobile bottom strip: scoreboard + chat side-by-side.
        Chat input stays visible for guessers — that's the whole point.
      */}
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
