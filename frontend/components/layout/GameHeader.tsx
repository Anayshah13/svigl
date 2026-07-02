"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { SviglLogo } from "@/components/layout/SviglLogo";
import { Button } from "@/components/ui/Button";
import { useRoomStore } from "@/stores/room";
import { useSessionStore } from "@/stores/session";

export function GameHeader() {
  const router = useRouter();
  const room = useRoomStore((s) => s.room);
  const game = room?.game;
  const selfId = useSessionStore((s) => s.selfId);
  const isHost = room && selfId && room.hostId === selfId;

  const remaining = game?.remainingTime;
  const timerDisplay =
    remaining != null
      ? `${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, "0")}`
      : "—:—";

  const hints = game?.currentWordHints ?? "—";
  const letterCount = hints === "—" ? 0 : hints.replace(/\s/g, "").length;

  const leaveRoom = () => router.push("/");

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-gray-200/80 bg-white/90 px-4 backdrop-blur-xl lg:px-6">
      <div className="flex items-center gap-4">
        <SviglLogo />
        <div className="hidden text-sm text-gray-500 sm:block">
          <span className="font-mono font-semibold text-gray-700">
            room: {room?.code ?? "—"}
          </span>
          <span className="mx-2 text-gray-300">·</span>
          <span>
            Round {game?.round ?? "—"} of {game?.totalRounds ?? "—"}
          </span>
        </div>
      </div>

      <div className="flex flex-col items-center">
        <p className="font-mono text-sm tracking-[0.2em] text-gray-700">guessing {hints}</p>
        <p className="text-[10px] text-gray-400">{letterCount} letters</p>
      </div>

      <div className="flex items-center gap-3">
        <motion.div
          className="flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1.5 font-mono text-sm font-semibold text-gray-700 shadow-sm"
          animate={remaining != null && remaining <= 10 ? { scale: [1, 1.05, 1] } : {}}
          transition={{ duration: 0.5, repeat: remaining != null && remaining <= 10 ? Infinity : 0 }}
        >
          <span className="h-2 w-2 rounded-full bg-emerald-400" />
          {timerDisplay}
        </motion.div>
        {isHost && (
          <Button variant="outline" size="sm">
            End round
          </Button>
        )}
        <button
          type="button"
          onClick={leaveRoom}
          className="rounded-full p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
          aria-label="Leave room"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
          </svg>
        </button>
        <Link
          href="/settings"
          className="rounded-full p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
          aria-label="Settings"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="3" />
            <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
          </svg>
        </Link>
      </div>
    </header>
  );
}
