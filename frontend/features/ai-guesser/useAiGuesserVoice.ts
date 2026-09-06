"use client";

import * as React from "react";
import { requestAiSpeech } from "@/services/ai-guesser";
import { resolveSpokenAudio, sameSpeech } from "./speech";
import { PcmPlayer, playSpeechResponse } from "./speechPlayer";
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
  enabled: boolean;
}

export interface UseAiGuesserVoiceResult {
  muted: boolean;
  speaking: boolean;
  spokenText: string;
  toggleMuted: () => void;
}

/**
 * Speaks each new understanding as the guesser updates.
 *
 * Audio is a short streamed clip so playback can start before Gemini finishes.
 * The previous clip keeps playing until the first new samples arrive.
 */
export function useAiGuesserVoice(
  options: UseAiGuesserVoiceOptions,
): UseAiGuesserVoiceResult {
  const { line, guesses, enabled } = options;
  const topAnswer = guesses[0]?.answer ?? "";
  const text = resolveSpokenAudio(line, topAnswer);
  const [muted, setMuted] = React.useState(readMuted);
  const [speaking, setSpeaking] = React.useState(false);

  const playerRef = React.useRef<PcmPlayer | null>(null);
  const lastSpokenRef = React.useRef("");

  const player = (): PcmPlayer => {
    playerRef.current ??= new PcmPlayer();
    return playerRef.current;
  };

  const stop = React.useCallback(() => {
    playerRef.current?.stop();
    setSpeaking(false);
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
    if (!enabled || muted) return;

    if (!text) {
      lastSpokenRef.current = "";
      stop();
      return;
    }
    if (sameSpeech(text, lastSpokenRef.current)) return;

    lastSpokenRef.current = text;
    const controller = new AbortController();
    let active = true;
    setSpeaking(true);
    void player()
      .resume()
      .then(() => requestAiSpeech(text, controller.signal))
      .then((response) => playSpeechResponse(response, player(), controller.signal))
      .catch(() => {
        /* keep the last clip; guesses still show */
      })
      .finally(() => {
        if (active) setSpeaking(false);
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [enabled, muted, stop, text]);

  React.useEffect(
    () => () => {
      playerRef.current?.dispose();
      playerRef.current = null;
    },
    [],
  );

  return { muted, speaking, spokenText: text, toggleMuted };
}
