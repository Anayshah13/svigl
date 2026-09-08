"use client";

import { cn } from "@/lib/cn";
import { MascotAnAI } from "@/features/anai";
import "@/features/anai/anai.css";

export type AnaiMood = "idle" | "watching" | "thinking" | "speaking" | "solved";

export function AnaiSpeech({
  line,
  mood,
  compact = false,
  className,
}: {
  line: string;
  mood: AnaiMood;
  /** Slim mascot + one-line bubble for viewport-locked layouts. */
  compact?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "anai-duel flex items-end",
        compact ? "gap-2" : "gap-3",
        mood === "speaking" && "anai-duel-speaking",
        mood === "solved" && "anai-duel-solved",
        className,
      )}
    >
      <div
        className={cn(
          "anai-duel-bot relative shrink-0",
          compact ? "h-16 w-[4.75rem]" : "h-32 w-36 sm:h-36 sm:w-40",
          mood === "thinking" && "anai-duel-thinking",
        )}
        aria-hidden
      >
        <MascotAnAI />
      </div>
      <div className={cn("min-w-0 flex-1", compact ? "pb-0.5" : "pb-3")}>
        {compact ? null : (
          <p className="mb-1 font-mono text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-plum">
            AnAI
            {mood === "speaking" ? " · live" : null}
            {mood === "solved" ? " · score" : null}
          </p>
        )}
        <div
          className={cn(
            "relative rounded-2xl rounded-bl-sm shadow-sm",
            compact
              ? "px-2.5 py-1.5 text-xs leading-snug"
              : "px-3.5 py-2.5 text-sm leading-snug",
            mood === "solved"
              ? "bg-green-light text-ink"
              : mood === "speaking"
                ? "bg-pink-light text-ink"
                : "bg-plum-light text-ink",
          )}
        >
          <span
            aria-hidden
            className={cn(
              "absolute -left-1.5 rotate-45",
              compact ? "bottom-2 h-2.5 w-2.5" : "bottom-3 h-3 w-3",
              mood === "solved"
                ? "bg-green-light"
                : mood === "speaking"
                  ? "bg-pink-light"
                  : "bg-plum-light",
            )}
          />
          <p
            className={cn(
              "relative font-medium",
              compact && "line-clamp-2",
            )}
          >
            {line}
          </p>
        </div>
      </div>
    </div>
  );
}
