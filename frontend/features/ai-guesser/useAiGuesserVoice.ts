"use client";

import * as React from "react";
import { isAbortError } from "@/lib/api";
import { requestAiSpeech } from "@/services/ai-guesser";
import { resolveSpokenAudio, sameSpeech } from "./speech";
import {
  canUseLocalSpeech,
  speakLocally,
  unlockLocalSpeech,
} from "./speechLocal";
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
  enabled?: boolean;
  /** When the backend reports server TTS is configured. */
  ttsEnabled?: boolean;
  solved?: boolean;
  secret?: string;
}

export interface UseAiGuesserVoiceResult {
  muted: boolean;
  speaking: boolean;
  spokenText: string;
  toggleMuted: () => void;
  /** Call from a pointer gesture so the first shout is allowed. */
  unlock: () => void;
}

/**
 * Speaks each new shout. Prefers server TTS when available, otherwise the
 * browser voice. Falls back to local speech on any remote failure.
 *
 * Any user interaction on the page counts as an audio unlock so we do not miss
 * the first shout when the AI accepts a guess before the player has drawn.
 */
export function useAiGuesserVoice(
  options: UseAiGuesserVoiceOptions,
): UseAiGuesserVoiceResult {
  const {
    line,
    guesses,
    enabled = true,
    ttsEnabled = false,
    solved = false,
    secret = "",
  } = options;
  const latestAnswer = solved
    ? secret || guesses[guesses.length - 1]?.answer || ""
    : (guesses[guesses.length - 1]?.answer ?? "");
  const incoming = resolveSpokenAudio(line, latestAnswer, { solved });

  const [muted, setMuted] = React.useState(readMuted);
  const [speaking, setSpeaking] = React.useState(false);
  const [spokenText, setSpokenText] = React.useState("");

  const playerRef = React.useRef<PcmPlayer | null>(null);
  const localCancelRef = React.useRef<(() => void) | null>(null);
  const remoteAbortRef = React.useRef<AbortController | null>(null);
  const lastSpokenRef = React.useRef("");
  const unlockedRef = React.useRef(false);
  const ttsEnabledRef = React.useRef(ttsEnabled);
  const mutedRef = React.useRef(muted);
  const enabledRef = React.useRef(enabled);
  ttsEnabledRef.current = ttsEnabled;
  mutedRef.current = muted;
  enabledRef.current = enabled;

  const stopAudio = React.useCallback(() => {
    localCancelRef.current?.();
    localCancelRef.current = null;
    remoteAbortRef.current?.abort();
    remoteAbortRef.current = null;
    playerRef.current?.stop();
  }, []);

  const unlock = React.useCallback(() => {
    if (unlockedRef.current) return;
    unlockedRef.current = true;
    unlockLocalSpeech();
    if (!playerRef.current) playerRef.current = new PcmPlayer();
    void playerRef.current.resume();
  }, []);

  // Auto-unlock on any gesture anywhere so the first shout is allowed even if
  // the user has not touched the whiteboard yet.
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const handler = () => unlock();
    const opts = { once: true, capture: true, passive: true } as const;
    window.addEventListener("pointerdown", handler, opts);
    window.addEventListener("keydown", handler, opts);
    window.addEventListener("touchstart", handler, opts);
    window.addEventListener("click", handler, opts);
    return () => {
      window.removeEventListener("pointerdown", handler, opts);
      window.removeEventListener("keydown", handler, opts);
      window.removeEventListener("touchstart", handler, opts);
      window.removeEventListener("click", handler, opts);
    };
  }, [unlock]);

  const toggleMuted = React.useCallback(() => {
    unlock();
    setMuted((current) => {
      const next = !current;
      try {
        window.localStorage.setItem(MUTE_KEY, next ? "1" : "0");
      } catch {
        /* ignore quota / private mode */
      }
      if (next) {
        // Silence anything already in flight.
        localCancelRef.current?.();
        localCancelRef.current = null;
        remoteAbortRef.current?.abort();
        remoteAbortRef.current = null;
        playerRef.current?.stop();
        setSpeaking(false);
      }
      return next;
    });
  }, [unlock]);

  const speak = React.useCallback(
    (text: string) => {
      if (!enabledRef.current || mutedRef.current) return;
      const cleaned = text.trim();
      if (!cleaned) return;
      if (sameSpeech(cleaned, lastSpokenRef.current)) return;
      lastSpokenRef.current = cleaned;
      setSpokenText(cleaned);

      // Interrupt whatever is playing so the newest shout wins.
      stopAudio();
      setSpeaking(true);

      const speakBrowser = () => {
        if (!canUseLocalSpeech()) {
          setSpeaking(false);
          return;
        }
        localCancelRef.current = speakLocally(cleaned, {
          onEnd: () => setSpeaking(false),
        });
      };

      const speakRemote = async () => {
        if (!ttsEnabledRef.current) {
          speakBrowser();
          return;
        }
        const player = playerRef.current ?? new PcmPlayer();
        playerRef.current = player;
        const controller = new AbortController();
        remoteAbortRef.current = controller;
        try {
          await player.resume();
          const response = await requestAiSpeech(cleaned, controller.signal);
          if (controller.signal.aborted) return;
          await playSpeechResponse(response, player, controller.signal);
          if (!controller.signal.aborted) setSpeaking(false);
        } catch (error) {
          if (controller.signal.aborted || isAbortError(error)) return;
          // Any real remote failure — quota, network, decode — falls back to
          // the browser voice so the player still hears something.
          speakBrowser();
        }
      };

      void speakRemote();
    },
    [stopAudio],
  );

  // Speak whenever the resolved line changes.
  React.useEffect(() => {
    if (!incoming) return;
    speak(incoming);
  }, [incoming, speak]);

  // Killswitch: mute / disable stops any in-flight audio immediately.
  React.useEffect(() => {
    if (muted || !enabled) {
      stopAudio();
      setSpeaking(false);
      lastSpokenRef.current = "";
    }
  }, [enabled, muted, stopAudio]);

  // Unmount cleanup.
  React.useEffect(
    () => () => {
      stopAudio();
      playerRef.current?.dispose();
      playerRef.current = null;
      if (canUseLocalSpeech()) {
        try {
          window.speechSynthesis.cancel();
        } catch {
          /* ignore */
        }
      }
    },
    [stopAudio],
  );

  return {
    muted,
    speaking,
    spokenText: spokenText || incoming,
    toggleMuted,
    unlock,
  };
}
