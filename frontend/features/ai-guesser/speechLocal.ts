/** Browser SpeechSynthesis — no Gemini quota, no /speak rate limit. */

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

export function speakLocally(
  text: string,
  handlers: { onEnd?: () => void } = {},
): () => void {
  if (!canUseLocalSpeech()) {
    handlers.onEnd?.();
    return () => {};
  }

  const synth = window.speechSynthesis;
  synth.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 1.04;
  utterance.pitch = 1;
  utterance.lang = "en-US";
  const voice = pickVoice(synth);
  if (voice) utterance.voice = voice;

  const finish = () => {
    utterance.onend = null;
    utterance.onerror = null;
    handlers.onEnd?.();
  };
  utterance.onend = finish;
  utterance.onerror = finish;
  synth.speak(utterance);

  return () => {
    utterance.onend = null;
    utterance.onerror = null;
    synth.cancel();
  };
}
