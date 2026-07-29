"use client";

import { useRouter } from "next/navigation";
import * as React from "react";
import {
  InviteFriendsIconButton,
  LeaveRoomIconButton,
  RoomCodeCopyButton,
} from "@/components/room/RoomInviteActions";
import { GameScreen } from "@/features/room/game";
import { cn } from "@/lib/cn";
import type { ChatMessage } from "@/types/room";
import {
  DEMO_ROOM_CODE,
  DEMO_SELF_ID,
  createDemoChatSeed,
  createDemoRoom,
  type DemoRole,
} from "./mockRoom";

const ROUND_DURATION = 80;

/**
 * Local layout playground for the live game room.
 * Uses the real GameScreen shells (drawer + guesser) with a local canvas —
 * no websockets. Toggle roles to screen-test mobile/desktop chrome.
 */
export function DemoGameView() {
  const router = useRouter();
  const [role, setRole] = React.useState<DemoRole>("drawer");
  const [remaining, setRemaining] = React.useState(ROUND_DURATION);
  const [messages, setMessages] = React.useState<ChatMessage[]>(() =>
    createDemoChatSeed("drawer"),
  );

  React.useEffect(() => {
    const id = window.setInterval(() => {
      setRemaining((prev) => (prev <= 0 ? ROUND_DURATION : prev - 1));
    }, 1000);
    return () => window.clearInterval(id);
  }, []);

  React.useEffect(() => {
    setMessages(createDemoChatSeed(role));
  }, [role]);

  const room = React.useMemo(
    () => createDemoRoom(remaining, role),
    [remaining, role],
  );
  const currentPlayer =
    room.players.find((p) => p.id === DEMO_SELF_ID) ?? null;

  const handleSendChat = React.useCallback(
    (text: string) => {
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
    },
    [currentPlayer?.name],
  );

  return (
    <div className="page-shell page-shell-game relative z-10 gap-2 overflow-hidden sm:gap-3">
      <div className="flex shrink-0 items-start justify-between gap-2">
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
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <span className="inline-flex rounded-full bg-plum/10 px-3 py-1 text-xs font-semibold text-plum">
              Layout demo
            </span>
            <RoleToggle role={role} onChange={setRole} />
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1.5 pt-0.5">
          <InviteFriendsIconButton code={DEMO_ROOM_CODE} />
          <LeaveRoomIconButton onLeave={() => router.push("/")} />
        </div>
      </div>

      <GameScreen
        key={role}
        room={room}
        currentPlayer={currentPlayer}
        onSelectWord={() => {}}
        onSendChat={handleSendChat}
        onLeaveRoom={() => router.push("/")}
        localCanvas
        chatMessages={messages}
        disableOnboarding
      />
    </div>
  );
}

function RoleToggle({
  role,
  onChange,
}: {
  role: DemoRole;
  onChange: (role: DemoRole) => void;
}) {
  return (
    <div
      role="group"
      aria-label="Demo role"
      className="inline-flex rounded-full border border-plum/20 bg-white p-0.5 shadow-sm"
    >
      {(["drawer", "guesser"] as const).map((value) => {
        const active = role === value;
        return (
          <button
            key={value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(value)}
            className={cn(
              "min-h-8 rounded-full px-3 text-xs font-semibold capitalize transition-colors touch-manipulation",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-plum/40",
              active
                ? "bg-plum text-white"
                : "text-ink-muted hover:text-ink",
            )}
          >
            {value}
          </button>
        );
      })}
    </div>
  );
}
