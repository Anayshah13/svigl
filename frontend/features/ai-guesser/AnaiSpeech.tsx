"use client";

import { cn } from "@/lib/cn";
import { MascotAnAI } from "@/features/anai";
import "@/features/anai/anai.css";

export type AnaiMood = "idle" | "watching" | "thinking" | "speaking" | "solved";

export function AnaiSpeech({
  line,
  mood,
  className,
}: {
  line: string;
  mood: AnaiMood;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "anai-duel flex items-end gap-3 border-t border-plum/10 pt-3",
        mood === "speaking" && "anai-duel-speaking",
        mood === "solved" && "anai-duel-solved",
        className,
      )}
    >
      <div
        className={cn(
          "anai-duel-bot relative h-24 w-28 shrink-0 sm:h-28 sm:w-32",
          mood === "thinking" && "anai-duel-thinking",
        )}
        aria-hidden
      >
        <MascotAnAI />
      </div>
      <div className="min-w-0 flex-1 pb-3">
        <p className="mb-1 font-mono text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-plum">
          AnAI
          {mood === "speaking" ? " · live" : null}
          {mood === "solved" ? " · score" : null}
        </p>
        <div
          className={cn(
            "relative rounded-2xl rounded-bl-sm px-3.5 py-2.5 text-sm leading-snug shadow-sm",
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
              "absolute -left-1.5 bottom-3 h-3 w-3 rotate-45",
              mood === "solved"
                ? "bg-green-light"
                : mood === "speaking"
                  ? "bg-pink-light"
                  : "bg-plum-light",
            )}
          />
          <p className="relative font-medium">{line}</p>
        </div>
      </div>
    </div>
  );
}
