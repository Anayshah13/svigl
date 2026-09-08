"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/cn";
import { AnaiSpeech, type AnaiMood } from "./AnaiSpeech";
import { answersMatch, emojiFor } from "./words";
import {
  STATUS_LABEL,
  type AiGuesserState,
  type AiGuesserStatus,
} from "./types";

const STATUS_LABEL_SHORT: Record<AiGuesserStatus, string> = {
  idle: "Waiting",
  watching: "Watching",
  thinking: "Thinking",
  updated: "Guessed",
  unavailable: "Offline",
};

const STATUS_STYLE: Record<AiGuesserStatus, string> = {
  idle: "bg-plum-light text-plum",
  watching: "bg-blue-light text-blue",
  thinking: "bg-pink-light text-pink",
  updated: "bg-green-light text-green",
  unavailable: "bg-ink/10 text-ink-muted",
};

function MuteIcon({ muted }: { muted: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {muted ? (
        <>
          <path d="M11 5 6 9H3v6h3l5 4V5z" />
          <path d="m16 10 6 6M22 10l-6 6" />
        </>
      ) : (
        <>
          <path d="M11 5 6 9H3v6h3l5 4V5z" />
          <path d="M16 9a5 5 0 0 1 0 6" />
          <path d="M18.5 7a8 8 0 0 1 0 10" />
        </>
      )}
    </svg>
  );
}

export interface AiGuessPanelProps {
  state: AiGuesserState;
  secret: string;
  solved: boolean;
  serviceEnabled: boolean | null;
  muted?: boolean;
  speaking?: boolean;
  spokenText?: string;
  onToggleMute?: () => void;
  /** Dock fills the desktop aside; strip is the mobile/landscape chat lane. */
  variant?: "dock" | "strip";
  className?: string;
}

export function AiGuessPanel({
  state,
  secret,
  solved,
  serviceEnabled,
  muted = false,
  speaking = false,
  spokenText = "",
  onToggleMute,
  variant = "dock",
  className,
}: AiGuessPanelProps) {
  const disabled = serviceEnabled === false;
  const status: AiGuesserStatus = disabled
    ? "unavailable"
    : solved
      ? "updated"
      : state.status;
  const strip = variant === "strip";

  const listRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [state.guesses.length, solved]);

  const latest = state.guesses[state.guesses.length - 1];
  const topConfidence = latest?.confidence ?? 0;
  const mood: AnaiMood = disabled
    ? "idle"
    : solved
      ? "solved"
      : speaking
        ? "speaking"
        : status === "thinking"
          ? "thinking"
          : status === "watching" || status === "updated"
            ? "watching"
            : "idle";
  const caption = disabled
    ? "No voice on this server. Draw anyway."
    : solved
      ? `Nailed it — ${secret}!`
      : spokenText
        ? spokenText
        : status === "thinking"
          ? "Scanning the ink..."
          : status === "idle"
            ? "Draw it. I'll shout when I see it."
            : "Still looking...";

  return (
    <aside
      className={cn(
        "flex h-full min-h-0 w-full flex-col overflow-hidden rounded-2xl border border-plum/15 bg-white/90 sm:rounded-3xl",
        className,
      )}
    >
      <header
        className={cn(
          "flex shrink-0 items-center justify-between gap-2 border-b border-plum/10",
          strip ? "px-2.5 py-1.5" : "px-3 py-2",
        )}
      >
        <div className="min-w-0">
          <h2 className="text-xs font-bold uppercase tracking-wider text-ink-muted">
            AnAI
          </h2>
          {strip ? null : (
            <p className="text-[0.65rem] text-ink-muted">1.3 Pro</p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {onToggleMute ? (
            <button
              type="button"
              onClick={onToggleMute}
              className={cn(
                "inline-flex min-h-9 touch-manipulation items-center gap-1 rounded-full px-2.5 text-xs font-semibold transition-colors",
                muted
                  ? "bg-ink/10 text-ink-muted"
                  : speaking
                    ? "bg-pink-light text-pink"
                    : "bg-plum-light text-plum",
              )}
              aria-pressed={!muted}
              aria-label={muted ? "Unmute AI voice" : "Mute AI voice"}
            >
              <MuteIcon muted={muted} />
              <span className="hidden sm:inline">
                {muted ? "Muted" : speaking ? "Live" : "Voice"}
              </span>
            </button>
          ) : null}
          <span
            className={cn(
              "shrink-0 rounded-full px-2.5 py-1 text-[0.65rem] font-semibold",
              STATUS_STYLE[status],
            )}
          >
            {solved ? (
              "Correct!"
            ) : status === "thinking" ? (
              <motion.span
                animate={{ opacity: [1, 0.45, 1] }}
                transition={{ duration: 1.2, repeat: Infinity }}
              >
                {STATUS_LABEL_SHORT.thinking}
              </motion.span>
            ) : (
              STATUS_LABEL_SHORT[status]
            )}
          </span>
        </div>
      </header>

      {disabled ? (
        <p className="shrink-0 bg-plum-light px-3 py-1.5 text-xs text-ink-muted">
          AI is not configured on this server. You can still draw.
        </p>
      ) : null}

      {!disabled && !solved && state.errorMessage ? (
        <p className="shrink-0 bg-pink-light px-3 py-1.5 text-xs text-ink">
          A look timed out. Keep drawing — it will try again.
        </p>
      ) : null}

      <div
        ref={listRef}
        className={cn(
          "min-h-0 flex-1 overflow-y-auto overscroll-contain",
          strip ? "space-y-1 px-2 py-1.5" : "space-y-1.5 px-2.5 py-2",
        )}
      >
        {state.guesses.length === 0 ? (
          <p className="px-1 text-xs text-ink-muted">
            {status === "idle"
              ? "Start drawing. AnAI shouts guesses here, like in a room."
              : "No shout yet — waiting for a confident look."}
          </p>
        ) : (
          <ol className="flex flex-col gap-1">
            <AnimatePresence initial={false}>
              {state.guesses.map((guess, index) => {
                const pct = Math.round(guess.confidence * 100);
                const hit = answersMatch(guess.answer, secret);
                const leading = index === state.guesses.length - 1;
                return (
                  <motion.li
                    key={guess.answer.toLowerCase()}
                    layout
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.18 }}
                    className={cn(
                      "relative overflow-hidden rounded-xl px-2 py-1.5",
                      hit || solved
                        ? "bg-green-light"
                        : leading
                          ? "bg-plum-light"
                          : "bg-plum-light/70",
                    )}
                  >
                    <div
                      aria-hidden
                      className={cn(
                        "absolute inset-y-0 left-0 transition-[width] duration-500",
                        hit ? "bg-green/20" : "bg-plum/10",
                      )}
                      style={{ width: `${pct}%` }}
                    />
                    <div className="relative flex items-center justify-between gap-2">
                      <span className="flex min-w-0 items-center gap-1.5">
                        <span aria-hidden className="text-sm">
                          {emojiFor(guess.answer)}
                        </span>
                        <span
                          className={cn(
                            "truncate capitalize",
                            leading || hit
                              ? "font-display text-sm text-ink"
                              : "text-xs font-semibold text-ink",
                          )}
                        >
                          {guess.answer}
                        </span>
                      </span>
                      <span className="shrink-0 font-mono text-xs font-semibold text-ink">
                        {pct}%
                      </span>
                    </div>
                  </motion.li>
                );
              })}
            </AnimatePresence>
          </ol>
        )}
      </div>

      <div
        className={cn(
          "shrink-0 border-t border-plum/10",
          strip ? "px-2 py-1.5" : "px-2.5 py-2",
        )}
      >
        <AnaiSpeech line={caption} mood={mood} compact />
      </div>

      <span className="sr-only" role="status" aria-live="polite">
        {solved
          ? `Correct. The AI guessed ${secret}.`
          : `${STATUS_LABEL[status]}${
              latest
                ? `. Guessed ${latest.answer} at ${Math.round(
                    topConfidence * 100,
                  )} percent.`
                : ""
            }${state.line ? ` ${state.line}` : ""}`}
      </span>
    </aside>
  );
}
