"use client";

import { useRouter } from "next/navigation";
import { MobileGameMenu } from "@/features/room/game/MobileGameMenu";
import { cn } from "@/lib/cn";
import { formatClockMs } from "./format";
import { aiGuesserPath } from "./week";

export function AiGuesserMobileHeader({
  secret,
  remainingMs,
  callsLeft,
  promptIndex,
  promptCount,
  solved,
  muted,
  hasInk,
  onClear,
  onToggleMute,
  className,
}: {
  secret: string;
  remainingMs: number;
  callsLeft: number;
  promptIndex: number;
  promptCount: number;
  solved: boolean;
  muted: boolean;
  hasInk: boolean;
  onClear: () => void;
  onToggleMute: () => void;
  className?: string;
}) {
  const router = useRouter();
  const urgent = remainingMs <= 10_000 && !solved;

  return (
    <header
      className={cn(
        "flex shrink-0 items-center gap-2 rounded-2xl border border-plum/15 bg-white/95 px-2 py-1.5 shadow-sm landscape:py-1",
        className,
      )}
    >
      <div className="shrink-0 text-left">
        <p
          className={cn(
            "font-mono text-lg font-bold tabular-nums leading-none",
            urgent ? "text-pink" : "text-plum",
          )}
        >
          {formatClockMs(remainingMs)}
        </p>
        <p className="text-[0.65rem] font-bold uppercase tracking-wider text-ink-muted">
          {callsLeft} calls
        </p>
      </div>

      <div className="min-w-0 flex-1 text-center">
        <p className="text-[0.65rem] font-bold uppercase tracking-[0.2em] text-plum">
          {solved ? "Guessed" : `Draw ${promptIndex + 1}/${promptCount}`}
        </p>
        <p
          className="truncate font-mono text-base font-bold uppercase tracking-[0.12em] text-ink sm:text-lg"
          aria-label={`Your word: ${secret}`}
        >
          {secret}
        </p>
      </div>

      <MobileGameMenu
        label="AI Guesser menu"
        className="shrink-0"
        actions={[
          {
            id: "mute",
            label: muted ? "Unmute AnAI" : "Mute AnAI",
            onSelect: onToggleMute,
          },
          {
            id: "clear",
            label: hasInk ? "Clear drawing" : "Board is empty",
            onSelect: onClear,
          },
          {
            id: "hub",
            label: "Weekly games",
            onSelect: () => router.push(aiGuesserPath()),
          },
          {
            id: "home",
            label: "Back to Home",
            onSelect: () => router.push("/"),
          },
        ]}
      />
    </header>
  );
}
