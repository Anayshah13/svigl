"use client";

import * as React from "react";
import Link from "next/link";
import {
  DRAWER_WHITEBOARD_UI,
  Whiteboard,
  type WhiteboardController,
} from "@/features/whiteboard";
import { AiGuessPanel } from "./AiGuessPanel";
import { useAiGuesser } from "./useAiGuesser";
import { useAiGuesserVoice } from "./useAiGuesserVoice";
import type { GuessItem } from "./types";
import {
  AI_GUESSER_WORDS,
  guessesMatchSecret,
  pickNextWord,
} from "./words";

const BUTTON_BASE =
  "rounded-full px-4 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50";

const CORRECT_HOLD_MS = 1600;

export function AiGuesserView() {
  const controllerRef = React.useRef<WhiteboardController | null>(null);
  const advancingRef = React.useRef(false);
  const holdTimerRef = React.useRef<number | null>(null);
  const resetRef = React.useRef<() => void>(() => {});

  const [secret, setSecret] = React.useState(() =>
    pickNextWord(AI_GUESSER_WORDS),
  );
  const [score, setScore] = React.useState(0);
  const [round, setRound] = React.useState(1);
  const [solved, setSolved] = React.useState(false);
  const secretRef = React.useRef(secret);
  secretRef.current = secret;

  const beginNextRound = React.useCallback((opts: { scored: boolean }) => {
    if (advancingRef.current) return;
    advancingRef.current = true;

    if (opts.scored) {
      setSolved(true);
      setScore((n) => n + 1);
    }

    if (holdTimerRef.current !== null) {
      window.clearTimeout(holdTimerRef.current);
    }
    holdTimerRef.current = window.setTimeout(() => {
      holdTimerRef.current = null;
      controllerRef.current?.clear();
      resetRef.current();
      setSecret((current) => pickNextWord(AI_GUESSER_WORDS, current));
      setRound((n) => n + 1);
      setSolved(false);
      advancingRef.current = false;
    }, opts.scored ? CORRECT_HOLD_MS : 0);
  }, []);

  const onAcceptedGuesses = React.useCallback(
    (guesses: GuessItem[]) => {
      if (advancingRef.current) return;
      if (guessesMatchSecret(guesses, secretRef.current)) {
        beginNextRound({ scored: true });
      }
    },
    [beginNextRound],
  );

  React.useEffect(
    () => () => {
      if (holdTimerRef.current !== null) {
        window.clearTimeout(holdTimerRef.current);
      }
    },
    [],
  );

  const {
    state,
    onShapesChange,
    reset,
    resetSession,
    serviceEnabled,
    ttsEnabled,
    model,
  } = useAiGuesser({
    onAcceptedGuesses,
  });
  resetRef.current = reset;

  const { muted, speaking, spokenText, toggleMuted } = useAiGuesserVoice({
    line: state.line,
    guesses: state.guesses,
    enabled: Boolean(ttsEnabled && serviceEnabled),
  });

  const clearDrawing = React.useCallback(() => {
    controllerRef.current?.clear();
    reset();
  }, [reset]);

  const skipWord = React.useCallback(() => {
    beginNextRound({ scored: false });
  }, [beginNextRound]);

  const restartGame = React.useCallback(() => {
    if (holdTimerRef.current !== null) {
      window.clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    advancingRef.current = false;
    controllerRef.current?.clear();
    resetSession();
    setScore(0);
    setRound(1);
    setSolved(false);
    setSecret(pickNextWord(AI_GUESSER_WORDS));
  }, [resetSession]);

  const hasInk = state.drawingVersion > 0 && state.status !== "idle";

  return (
    <div className="page-shell flex flex-col gap-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-plum">
            Experimental
          </p>
          <h1 className="font-display text-3xl leading-tight text-ink sm:text-4xl">
            AI Guesser
          </h1>
          <p className="mt-1 text-sm text-ink-muted">
            Draw the word. If the AI names it, you score and move on.
          </p>
        </div>
        <Link
          href="/"
          className="text-sm font-semibold text-plum underline-offset-2 hover:underline"
        >
          Back to Svigl
        </Link>
      </header>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-plum/15 bg-bg-surface px-4 py-3 shadow-(--shadow-soft) sm:px-5">
        <div>
          <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-ink-muted">
            Draw this
          </p>
          <p className="font-display text-2xl capitalize leading-tight text-ink sm:text-3xl">
            {secret}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="text-right">
            <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-ink-muted">
              Score
            </p>
            <p className="font-mono text-xl font-semibold text-plum">
              {score}
              <span className="ml-1 text-sm text-ink-muted">/ {round}</span>
            </p>
          </div>
          {solved ? (
            <p className="rounded-full bg-green-light px-3 py-1 text-sm font-semibold text-green">
              It guessed it!
            </p>
          ) : null}
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_21rem] lg:items-start">
        <section className="flex flex-col gap-3">
          <Whiteboard
            {...DRAWER_WHITEBOARD_UI}
            isDrawer
            fill
            playerId="ai-guesser"
            controllerRef={controllerRef}
            className="h-[min(68vh,680px)] rounded-3xl"
            onShapesChange={onShapesChange}
            onClear={reset}
          />

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={clearDrawing}
              disabled={!hasInk || solved}
              className={`${BUTTON_BASE} bg-plum text-white hover:bg-plum/90`}
            >
              Clear drawing
            </button>
            <button
              type="button"
              onClick={skipWord}
              disabled={solved}
              className={`${BUTTON_BASE} bg-plum-light text-plum hover:bg-plum/20`}
            >
              Skip word
            </button>
            <button
              type="button"
              onClick={restartGame}
              className={`${BUTTON_BASE} text-ink-muted hover:text-ink`}
            >
              New game
            </button>
          </div>
        </section>

        <AiGuessPanel
          state={state}
          secret={secret}
          solved={solved}
          serviceEnabled={serviceEnabled}
          model={model}
          wordCount={AI_GUESSER_WORDS.length}
          muted={muted}
          speaking={speaking}
          spokenText={spokenText}
          onToggleMute={toggleMuted}
        />
      </div>
    </div>
  );
}
