/**
 * What the Gemini TTS endpoint should read aloud as the drawing evolves.
 *
 * Prefer the model's spoken `line`. If it omitted one, fall back to the
 * current top guess so the player still hears what the AI thinks it sees.
 */

const MAX_SPEECH_CHARS = 140;
const MAX_SPOKEN_CHARS = 64;

export function resolveSpeechText(
  line: string | null | undefined,
  topAnswer?: string | null,
  options?: { solved?: boolean },
): string {
  const guess = (topAnswer ?? "").replace(/\s+/g, " ").trim();
  if (options?.solved && guess) {
    return `Oh, I know, it's ${guess}.`.slice(0, MAX_SPEECH_CHARS);
  }

  const aside = (line ?? "").replace(/\s+/g, " ").trim();
  if (aside) return aside.slice(0, MAX_SPEECH_CHARS);

  if (!guess) return "";
  return `Looks like ${guess}.`.slice(0, MAX_SPEECH_CHARS);
}

/** Short clip sent to Gemini TTS — a long aside is what made speech lag. */
export function resolveSpokenAudio(
  line: string | null | undefined,
  topAnswer?: string | null,
  options?: { solved?: boolean },
): string {
  const guess = (topAnswer ?? "").replace(/\s+/g, " ").trim();
  if (options?.solved && guess) {
    return `Oh, I know, it's ${guess}.`.slice(0, MAX_SPOKEN_CHARS);
  }
  if (guess) return `Looks like ${guess}.`.slice(0, MAX_SPOKEN_CHARS);
  const aside = (line ?? "").replace(/\s+/g, " ").trim();
  if (!aside) return "";
  const first = aside.split(/(?<=[.!?])\s+/)[0] ?? aside;
  return first.slice(0, MAX_SPOKEN_CHARS);
}

export function sameSpeech(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}
