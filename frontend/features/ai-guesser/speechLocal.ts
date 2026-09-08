/** Browser SpeechSynthesis helpers — hardened for Chrome cancel/pause bugs. */

export function canUseLocalSpeech(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

function pickVoice(synth: SpeechSynthesis): SpeechSynthesisVoice | null {
  const voices = synth.getVoices();
  if (voices.length === 0) return null;
  const prefer = (test: (voice: SpeechSynthesisVoice) => boolean) =>
    voices.find(test) ?? null;
  return (
    prefer((voice) => voice.lang.toLowerCase().startsWith("en-us")) ??
    prefer((voice) => voice.lang.toLowerCase().startsWith("en")) ??
    voices[0] ??
    null
  );
}

/** Prime synthesis on a real user gesture so later shouts are allowed. */
export function unlockLocalSpeech(): void {
  if (!canUseLocalSpeech()) return;
  const synth = window.speechSynthesis;
  try {
    synth.getVoices();
    if (synth.paused) synth.resume();
    // A silent utterance counts as activation in Chromium.
    const warm = new SpeechSynthesisUtterance(" ");
    warm.volume = 0;
    warm.rate = 2;
    synth.speak(warm);
    synth.cancel();
  } catch {
    /* ignore */
  }
}

/**
 * Speak `text`. Returns a cancel function.
 * Chrome often drops speak() if it follows cancel() in the same tick, so we
 * schedule the utterance after a short gap and keep resume() pumping.
 */
export function speakLocally(
  text: string,
  handlers: { onEnd?: () => void } = {},
): () => void {
  if (!canUseLocalSpeech() || !text.trim()) {
    handlers.onEnd?.();
    return () => {};
  }

  const synth = window.speechSynthesis;
  let cancelled = false;
  let utterance: SpeechSynthesisUtterance | null = null;
  let resumeTimer: ReturnType<typeof setInterval> | null = null;

  const finish = () => {
    if (resumeTimer !== null) {
      clearInterval(resumeTimer);
      resumeTimer = null;
    }
    if (utterance) {
      utterance.onend = null;
      utterance.onerror = null;
      utterance = null;
    }
    handlers.onEnd?.();
  };

  const start = () => {
    if (cancelled) return;
    try {
      if (synth.paused) synth.resume();
    } catch {
      /* ignore */
    }

    const next = new SpeechSynthesisUtterance(text);
    next.rate = 1.04;
    next.pitch = 1;
    next.lang = "en-US";
    const voice = pickVoice(synth);
    if (voice) next.voice = voice;
    next.onend = () => {
      if (!cancelled) finish();
    };
    next.onerror = () => {
      if (!cancelled) finish();
    };
    utterance = next;
    synth.speak(next);

    // Chromium sometimes pauses mid-utterance when the tab is busy.
    resumeTimer = setInterval(() => {
      if (cancelled) return;
      try {
        if (synth.paused) synth.resume();
      } catch {
        /* ignore */
      }
    }, 250);
  };

  try {
    synth.cancel();
  } catch {
    /* ignore */
  }

  // Defer past cancel() — same-tick speak is a known Chromium no-op.
  const startTimer = setTimeout(start, 60);

  return () => {
    cancelled = true;
    clearTimeout(startTimer);
    if (resumeTimer !== null) {
      clearInterval(resumeTimer);
      resumeTimer = null;
    }
    if (utterance) {
      utterance.onend = null;
      utterance.onerror = null;
      utterance = null;
    }
    try {
      synth.cancel();
    } catch {
      /* ignore */
    }
  };
}
