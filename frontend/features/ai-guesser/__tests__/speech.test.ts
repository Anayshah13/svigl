import { describe, expect, it } from "vitest";
import { resolveSpokenAudio, resolveSpeechText, sameSpeech } from "../speech";

describe("resolveSpeechText", () => {
  it("prefers the spoken line", () => {
    expect(resolveSpeechText("Wait, is that a tail? Dog.", "cat")).toBe(
      "Wait, is that a tail? Dog.",
    );
  });

  it("falls back to the top guess", () => {
    expect(resolveSpeechText(null, "dog")).toBe("Looks like dog.");
    expect(resolveSpeechText("   ", "  house ")).toBe("Looks like house.");
  });

  it("uses a reveal line when the secret is hit", () => {
    expect(resolveSpeechText("Wait, a tail?", "dog", { solved: true })).toBe(
      "Oh, I know, it's dog.",
    );
  });

  it("is empty when there is nothing to say", () => {
    expect(resolveSpeechText(null, "")).toBe("");
    expect(resolveSpeechText(undefined, undefined)).toBe("");
  });
});

describe("resolveSpokenAudio", () => {
  it("speaks a short guess so TTS stays ahead of the drawing", () => {
    expect(resolveSpokenAudio("Wait, is that a tail? Going with dog.", "dog")).toBe(
      "Looks like dog.",
    );
  });

  it("uses the first sentence when there is no guess yet", () => {
    expect(resolveSpokenAudio("Hmm, a circle. Maybe the sun?", null)).toBe(
      "Hmm, a circle.",
    );
  });

  it("shouts a reveal when the word is guessed", () => {
    expect(
      resolveSpokenAudio("Looks like a tail.", "dog", { solved: true }),
    ).toBe("Oh, I know, it's dog.");
  });

  it("keeps the guessed word even if a newer secret is also in play", () => {
    expect(resolveSpokenAudio(null, "dog", { solved: true })).toBe(
      "Oh, I know, it's dog.",
    );
  });
});

describe("sameSpeech", () => {
  it("ignores case and outer space", () => {
    expect(sameSpeech("  Dog  ", "dog")).toBe(true);
    expect(sameSpeech("dog", "cat")).toBe(false);
  });
});
