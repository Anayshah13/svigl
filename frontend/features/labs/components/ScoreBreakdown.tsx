"use client";

import { cn } from "@/lib/cn";
import type { LabScoreResult } from "@/lib/labs";

export function ScoreBreakdown({ result }: { result: LabScoreResult }) {
  const rejected = result.status !== "VALID";

  return (
    <div
      className={cn(
        "rounded-2xl border p-5 shadow-(--shadow-soft)",
        rejected ? "border-pink/25 bg-pink/5" : "border-gray-200/80 bg-white",
      )}
    >
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-plum">Result</p>
          <p className="mt-1 text-[clamp(2rem,6vw,2.75rem)] font-bold tracking-tight text-ink">
            {rejected ? "—" : `${result.final_score.toFixed(1)}%`}
          </p>
          <p className="mt-1 text-sm text-ink-muted">
            {rejected
              ? result.message ?? statusLabel(result.status)
              : "Overall precision score"}
          </p>
        </div>
        <span
          className={cn(
            "mt-3 inline-flex w-fit rounded-full px-3 py-1 text-xs font-semibold sm:mt-0",
            rejected ? "bg-pink-light text-pink" : "bg-green-light text-green",
          )}
        >
          {statusLabel(result.status)}
        </span>
      </div>

      {result.metrics.length > 0 ? (
        <ul className="mt-5 space-y-2.5">
          {result.metrics.map((m) => (
            <li key={m.id}>
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="font-medium text-ink">{m.label}</span>
                <span className="tabular-nums font-semibold text-plum">
                  {m.score.toFixed(0)}%
                </span>
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-plum-light/60">
                <div
                  className="h-full rounded-full bg-plum transition-all duration-500"
                  style={{ width: `${Math.max(0, Math.min(100, m.score))}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      ) : null}

      {result.flags.is_hardware_assisted ? (
        <p className="mt-4 text-xs text-ink-muted">
          Note: stroke smoothness looked mechanically perfect — flagged for review.
        </p>
      ) : null}
    </div>
  );
}

function statusLabel(status: LabScoreResult["status"]): string {
  switch (status) {
    case "VALID":
      return "Valid";
    case "REJECTED_BOT":
      return "Rejected · bot-like";
    case "REJECTED_SCRIBBLE":
      return "Rejected · scribble";
    case "REJECTED_MULTI_LOOP":
      return "Rejected · multi-loop";
    case "REJECTED_SHAPE":
      return "Rejected · shape";
    case "REJECTED_TOO_SHORT":
      return "Rejected · too short";
    case "REJECTED_TRACING":
      return "Rejected · tracing";
    default:
      return status;
  }
}
