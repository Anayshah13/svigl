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

const STATUS_STYLE: Record<AiGuesserStatus, string> = {
  idle: "bg-plum-light text-plum",
  watching: "bg-blue-light text-blue",
  thinking: "bg-pink-light text-pink",
  updated: "bg-green-light text-green",
  unavailable: "bg-ink/10 text-ink-muted",
};

/** Ticks only while a timestamp is on screen, for the "Xs ago" readout. */
function useRelativeClock(active: boolean): number {
  const [now, setNow] = React.useState(() => Date.now());

  React.useEffect(() => {
    if (!active) return;
    const timer = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(timer);
  }, [active]);

  return now;
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[0.65rem] font-semibold uppercase tracking-wide text-ink-muted">
        {label}
      </span>
      <span className="font-mono text-sm font-semibold text-ink">{value}</span>
    </div>
  );
}

export interface AiGuessPanelProps {
  state: AiGuesserState;
  secret: string;
  solved: boolean;
  serviceEnabled: boolean | null;
  model: string | null;
  wordCount: number;
  muted?: boolean;
  speaking?: boolean;
  spokenText?: string;
  onToggleMute?: () => void;
  className?: string;
}

export function AiGuessPanel({
  state,
  secret,
  solved,
  serviceEnabled,
  model,
  wordCount,
  muted = false,
  speaking = false,
  spokenText = "",
  onToggleMute,
  className,
}: AiGuessPanelProps) {
  const disabled = serviceEnabled === false;
  const status: AiGuesserStatus = disabled
    ? "unavailable"
    : solved
      ? "updated"
      : state.status;

  const now = useRelativeClock(state.lastAnalyzedAt !== null);
  const secondsAgo =
    state.lastAnalyzedAt === null
      ? null
      : Math.max(0, (now - state.lastAnalyzedAt) / 1000);

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
        "flex w-full flex-col gap-4 rounded-3xl border border-plum/15 bg-bg-surface p-4 shadow-(--shadow-soft) sm:p-5",
        className,
      )}
    >
      <header className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-lg leading-tight text-ink">
            AI Guesser
          </h2>
          {model ? (
            <p className="font-mono text-[0.65rem] text-ink-muted">{model}</p>
          ) : (
            <p className="text-[0.65rem] text-ink-muted">
              {wordCount} possible words
            </p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {onToggleMute ? (
            <button
              type="button"
              onClick={onToggleMute}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-semibold transition-colors",
                muted
                  ? "bg-ink/10 text-ink-muted"
                  : speaking
                    ? "bg-pink-light text-pink"
                    : "bg-plum-light text-plum",
              )}
              aria-pressed={!muted}
              aria-label={muted ? "Unmute AI voice" : "Mute AI voice"}
            >
              {muted ? "Muted" : speaking ? "Speaking" : "Voice on"}
            </button>
          ) : null}
        <span
          className={cn(
            "shrink-0 rounded-full px-3 py-1 text-xs font-semibold",
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
              {STATUS_LABEL.thinking}
            </motion.span>
          ) : (
            STATUS_LABEL[status]
          )}
        </span>
        </div>
      </header>

      {disabled ? (
        <p className="rounded-2xl bg-plum-light px-3 py-2 text-sm text-ink-muted">
          AI is not configured on this server. You can still draw freely.
        </p>
      ) : null}

      {!disabled && !solved && state.errorMessage ? (
        <p className="rounded-2xl bg-pink-light px-3 py-2 text-sm text-ink">
          One of the last looks timed out. Keep drawing — it will try again.
        </p>
      ) : null}

      <div className="min-h-[8.5rem]">
        {state.guesses.length === 0 ? (
          <p className="text-sm text-ink-muted">
            {status === "idle"
              ? "Start drawing. AnAI shouts one guess at a time, like in a real game."
              : "No shout yet — waiting for a confident look."}
          </p>
        ) : (
          <>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-muted">
              Shouted in chat
            </p>
            <ol className="flex flex-col gap-2">
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
                        "relative overflow-hidden rounded-2xl px-3 py-2",
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
                      <div className="relative flex items-center justify-between gap-3">
                        <span className="flex min-w-0 items-center gap-2">
                          <span aria-hidden className="text-base">
                            {emojiFor(guess.answer)}
                          </span>
                          <span
                            className={cn(
                              "truncate capitalize",
                              leading || hit
                                ? "font-display text-base text-ink"
                                : "text-sm font-semibold text-ink",
                            )}
                          >
                            {guess.answer}
                          </span>
                        </span>
                        <span className="shrink-0 font-mono text-sm font-semibold text-ink">
                          {pct}%
                        </span>
                      </div>
                    </motion.li>
                  );
                })}
              </AnimatePresence>
            </ol>
          </>
        )}
      </div>

      <AnaiSpeech line={caption} mood={mood} />

      <div className="grid grid-cols-2 gap-3 border-t border-plum/10 pt-3 sm:grid-cols-4">
        <Metric label="AI calls" value={String(state.callsThisDrawing)} />
        <Metric
          label="Latency"
          value={state.latencyMs === null ? "—" : `${state.latencyMs}ms`}
        />
        <Metric
          label="Analyzed"
          value={secondsAgo === null ? "—" : `${secondsAgo.toFixed(1)}s ago`}
        />
        <Metric label="Session" value={String(state.callsThisSession)} />
      </div>

      <p className="text-xs text-ink-muted">
        Draw <span className="font-semibold text-ink">{secret}</span> clearly.
        Close calls from lookalike words do not score. {wordCount} secrets in
        the deck.
      </p>

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
