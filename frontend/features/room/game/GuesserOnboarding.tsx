"use client";

import * as React from "react";
import { cn } from "@/lib/cn";

const STORAGE_KEY = "svigl.guesser.onboarding.dismissed";

export function useGuesserOnboarding(enabled: boolean) {
  const [visible, setVisible] = React.useState(false);

  React.useEffect(() => {
    if (!enabled) {
      setVisible(false);
      return;
    }
    try {
      if (localStorage.getItem(STORAGE_KEY) === "1") {
        setVisible(false);
        return;
      }
    } catch {
      /* private mode */
    }
    setVisible(true);
  }, [enabled]);

  const dismiss = React.useCallback((neverAgain: boolean) => {
    setVisible(false);
    if (neverAgain) {
      try {
        localStorage.setItem(STORAGE_KEY, "1");
      } catch {
        /* ignore */
      }
    }
  }, []);

  return { visible, dismiss };
}

export function GuesserOnboarding({
  onDismiss,
  className,
}: {
  onDismiss: (neverAgain: boolean) => void;
  className?: string;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="guesser-onboarding-title"
      className={cn(
        "absolute inset-0 z-40 flex items-end justify-center bg-ink/40 p-4 backdrop-blur-[2px] sm:items-center",
        className,
      )}
    >
      <div className="w-full max-w-md rounded-3xl border border-plum/20 bg-white p-5 shadow-lg sm:p-6">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-plum">
          You&apos;re guessing
        </p>
        <h2
          id="guesser-onboarding-title"
          className="mt-1 font-script text-3xl text-plum sm:text-4xl"
        >
          Watch &amp; guess.
        </h2>
        <ol className="mt-4 space-y-2 text-sm leading-relaxed text-ink">
          <li>
            <span className="font-semibold">1.</span> Watch the canvas — the
            drawer is sketching a word.
          </li>
          <li>
            <span className="font-semibold">2.</span> Type your guesses in chat.
            Correct guesses earn points; closer is faster.
          </li>
          <li>
            <span className="font-semibold">3.</span> Hints fill in over time.
            Keep an eye on the word blanks above the board.
          </li>
        </ol>
        <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={() => onDismiss(true)}
            className="min-h-11 rounded-xl px-4 text-sm font-semibold text-ink-muted hover:bg-plum-light/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-plum/40"
          >
            Don&apos;t show again
          </button>
          <button
            type="button"
            onClick={() => onDismiss(false)}
            className="min-h-11 rounded-xl bg-plum px-5 text-sm font-semibold text-white shadow-sm hover:bg-plum/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-plum/40"
          >
            Got it — let&apos;s guess
          </button>
        </div>
      </div>
    </div>
  );
}
