"use client";

import * as React from "react";
import { resolveSpokenAudio } from "./speech";
import { canUseLocalSpeech, speakLocally } from "./speechLocal";
import type { GuessItem } from "./types";

const MUTE_KEY = "svigl.ai-guesser.mute";

function readMuted(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(MUTE_KEY) === "1";
  } catch {
    return false;
  }
}

export interface UseAiGuesserVoiceOptions {
  line: string | null;
  guesses: readonly GuessItem[];
  enabled?: boolean;
  solved?: boolean;
  secret?: string;
}

export interface UseAiGuesserVoiceResult {
  muted: boolean;
  speaking: boolean;
  spokenText: string;
  toggleMuted: () => void;
  /** Prime voices on a pointer gesture so the first shout is allowed. */
  unlock: () => void;
}

/**
 * Speaks each new shout with the browser voice. Gemini TTS is not used —
 * its quota and our /speak limiter were killing clips every few guesses.
 */
export function useAiGuesserVoice(
  options: UseAiGuesserVoiceOptions,
): UseAiGuesserVoiceResult {
  const { line, guesses, enabled = true, solved = false, secret = "" } = options;
  const latestAnswer = solved
    ? secret || guesses[guesses.length - 1]?.answer || ""
    : (guesses[guesses.length - 1]?.answer ?? "");
  const text = resolveSpokenAudio(line, latestAnswer, { solved });
  const [muted, setMuted] = React.useState(readMuted);
  const [speaking, setSpeaking] = React.useState(false);

  const stop = React.useCallback(() => {
    if (canUseLocalSpeech()) window.speechSynthesis.cancel();
    setSpeaking(false);
  }, []);

  const unlock = React.useCallback(() => {
    if (!canUseLocalSpeech()) return;
    window.speechSynthesis.getVoices();
  }, []);

  const toggleMuted = React.useCallback(() => {
    setMuted((current) => {
      const next = !current;
      try {
        window.localStorage.setItem(MUTE_KEY, next ? "1" : "0");
      } catch {
        /* ignore quota / private mode */
      }
      return next;
    });
  }, []);

  React.useEffect(() => {
    if (muted) stop();
  }, [muted, stop]);

  React.useEffect(() => {
    if (!enabled || muted || !canUseLocalSpeech()) return;

    if (!text) {
      stop();
      return;
    }

    setSpeaking(true);
    const cancel = speakLocally(text, {
      onEnd: () => setSpeaking(false),
    });

    return () => {
      cancel();
      setSpeaking(false);
    };
  }, [enabled, muted, stop, text]);

  React.useEffect(
    () => () => {
      if (canUseLocalSpeech()) window.speechSynthesis.cancel();
    },
    [],
  );

  return { muted, speaking, spokenText: text, toggleMuted, unlock };
}
