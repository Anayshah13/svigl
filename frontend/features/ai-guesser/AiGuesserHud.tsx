"use client";

import { cn } from "@/lib/cn";
import { formatClockMs } from "./format";

export function AiGuesserHud({
  secret,
  remainingMs,
  callsLeft,
  maxCalls,
  promptIndex,
  promptCount,
  solved,
  missed,
  className,
}: {
  secret: string;
  remainingMs: number;
  callsLeft: number;
  maxCalls: number;
  promptIndex: number;
  promptCount: number;
  solved: boolean;
  missed?: boolean;
  className?: string;
}) {
  const urgent = remainingMs <= 10_000 && !solved && !missed;
  return (
    <div
      className={cn(
        "flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1",
        className,
      )}
    >
      <div className="min-w-0">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-plum">
          {solved ? "Guessed" : missed ? "Time" : "Draw this"}
        </p>
        <p
          className="truncate font-mono text-lg font-bold uppercase tracking-[0.14em] text-ink sm:text-2xl sm:tracking-[0.2em]"
          aria-label={`Your word: ${secret}`}
        >
          {secret}
        </p>
      </div>

      <div className="ml-auto flex min-w-0 shrink-0 items-center gap-3">
        <div className="text-right">
          <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-ink-muted">
            Prompt
          </p>
          <p className="font-mono text-lg font-semibold tabular-nums text-ink">
            {Math.min(promptIndex + 1, promptCount)}
            <span className="ml-0.5 text-sm text-ink-muted">/{promptCount}</span>
          </p>
        </div>
        <div className="text-right">
          <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-ink-muted">
            Calls
          </p>
          <p className="font-mono text-lg font-semibold tabular-nums text-plum">
            {callsLeft}
            <span className="ml-0.5 text-sm text-ink-muted">/{maxCalls}</span>
          </p>
        </div>
        <div className="text-right">
          <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-ink-muted">
            Time
          </p>
          <p
            className={cn(
              "font-mono text-lg font-semibold tabular-nums",
              urgent ? "text-pink" : "text-ink",
            )}
          >
            {formatClockMs(remainingMs)}
          </p>
        </div>
      </div>
    </div>
  );
}
