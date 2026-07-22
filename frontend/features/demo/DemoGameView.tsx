"use client";

import Link from "next/link";
import * as React from "react";
import { InviteFriendsPill, RoomCodeCopyButton } from "@/components/room/RoomInviteActions";
import { Button } from "@/components/ui/Button";
import {
  ChatPanel,
  GameTopBar,
  MobileChatSheet,
  Scoreboard,
} from "@/features/room/game";
import { DRAWER_WHITEBOARD_UI, Whiteboard } from "@/features/whiteboard";
import { cn } from "@/lib/cn";
import { formatDisplayName } from "@/lib/names";
import type { ChatMessage } from "@/types/room";
import {
  DEMO_CHAT_SEED,
  DEMO_ROOM_CODE,
  DEMO_SELF_ID,
  createDemoRoom,
} from "./mockRoom";

const ROUND_DURATION = 80;

/**
 * Local wireframe of the ROUND_ACTIVE drawer shell.
 * Same chrome as a live game room — no websockets or backend.
 */
export function DemoGameView() {
  const [remaining, setRemaining] = React.useState(ROUND_DURATION);
  const [messages, setMessages] = React.useState<ChatMessage[]>(DEMO_CHAT_SEED);
  const [mobileChatOpen, setMobileChatOpen] = React.useState(false);

  React.useEffect(() => {
    const id = window.setInterval(() => {
      setRemaining((prev) => (prev <= 0 ? ROUND_DURATION : prev - 1));
    }, 1000);
    return () => window.clearInterval(id);
  }, []);

  const room = React.useMemo(() => createDemoRoom(remaining), [remaining]);
  const currentPlayer =
    room.players.find((p) => p.id === DEMO_SELF_ID) ?? null;
  const drawerName = room.game.drawer
    ? formatDisplayName(room.game.drawer.name)
    : "Someone";

  const chatPanel = (
    <ChatPanel
      messages={messages}
      canSendChat={false}
      disabledReason="You're drawing — chat is disabled."
      onSend={(text) => {
        setMessages((prev) => [
          ...prev,
          {
            id: `local-${Date.now()}`,
            kind: "chat",
            message: text,
            playerId: DEMO_SELF_ID,
            playerName: currentPlayer?.name ?? "You",
            at: Date.now(),
          },
        ]);
      }}
      className="h-full min-h-0"
      placeholder="Type your guess here..."
    />
  );

  return (
    <div className="page-shell page-shell-game relative z-10 gap-2 overflow-hidden sm:gap-3">
      <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="relative inline-block pr-8">
            <h1 className="break-all font-mono text-xl font-bold tracking-[0.1em] text-ink sm:text-2xl sm:tracking-[0.14em]">
              {DEMO_ROOM_CODE}
            </h1>
            <RoomCodeCopyButton
              code={DEMO_ROOM_CODE}
              className="absolute bottom-0 right-0"
            />
          </div>
          <div className="mt-1">
            <span className="inline-flex rounded-full bg-plum/10 px-3 py-1 text-xs font-semibold text-plum">
              Game in progress
            </span>
          </div>
        </div>

        <div className="flex w-full flex-wrap items-center gap-1.5 sm:w-auto sm:gap-2">
          <InviteFriendsPill code={DEMO_ROOM_CODE} className="flex-1 sm:flex-none" />
          <Link href="/" className="flex-1 sm:flex-none">
            <Button
              type="button"
              variant="outline"
              className="w-full touch-manipulation sm:w-auto"
            >
              Leave room
            </Button>
          </Link>
        </div>
      </div>

      {/* Drawer shell — mirrors GameScreen canDraw layout */}
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
          currentPlayerId={DEMO_SELF_ID}
          className="hidden min-h-0 lg:flex lg:order-1"
        />

        <section className="relative order-1 flex min-h-0 min-w-0 flex-col lg:order-2">
          <Whiteboard
            isDrawer
            playerId={DEMO_SELF_ID}
            fill
            immersive
            {...DRAWER_WHITEBOARD_UI}
            className="min-h-0 flex-1"
            headerInfo={
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <GameTopBar
                  room={room}
                  isDrawer
                  hasGuessed={false}
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

          <MobileChatSheet
            open={mobileChatOpen}
            onClose={() => setMobileChatOpen(false)}
          >
            <div className="flex h-full min-h-[14rem] flex-col gap-2 p-2">
              <Scoreboard
                room={room}
                currentPlayerId={DEMO_SELF_ID}
                className="max-h-28 shrink-0"
              />
              <div className="min-h-0 flex-1">{chatPanel}</div>
            </div>
          </MobileChatSheet>
        </section>
      </div>
    </div>
  );
}
