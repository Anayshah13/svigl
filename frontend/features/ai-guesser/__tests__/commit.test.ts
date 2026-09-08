import { describe, expect, it } from "vitest";
import { normalizeGuessKey, pickCommittedGuess } from "../commit";
import { AI_GUESSER_CONFIG } from "../config";

const min = AI_GUESSER_CONFIG.MIN_CONFIDENCE;

describe("normalizeGuessKey", () => {
  it("collapses case and whitespace", () => {
    expect(normalizeGuessKey("  Dog   House ")).toBe("dog house");
  });
});

describe("pickCommittedGuess", () => {
  it("takes the first ranked guess above the floor", () => {
    const picked = pickCommittedGuess(
      [
        { answer: "dog", confidence: 0.81 },
        { answer: "wolf", confidence: 0.4 },
      ],
      [],
      min,
    );
    expect(picked).toEqual({ answer: "dog", confidence: 0.81 });
  });

  it("skips guesses that were already shouted", () => {
    const picked = pickCommittedGuess(
      [
        { answer: "Dog", confidence: 0.9 },
        { answer: "cat", confidence: 0.7 },
      ],
      ["dog"],
      min,
    );
    expect(picked).toEqual({ answer: "cat", confidence: 0.7 });
  });

  it("skips guesses under the confidence floor", () => {
    const picked = pickCommittedGuess(
      [
        { answer: "dog", confidence: 0.1 },
        { answer: "cat", confidence: 0.49 },
        { answer: "fish", confidence: 0.6 },
      ],
      [],
      min,
    );
    expect(picked).toEqual({ answer: "fish", confidence: 0.6 });
  });

  it("returns null when nothing is shoutable", () => {
    expect(
      pickCommittedGuess([{ answer: "dog", confidence: 0.1 }], [], min),
    ).toBeNull();
    expect(
      pickCommittedGuess([{ answer: "dog", confidence: 0.9 }], ["dog"], min),
    ).toBeNull();
  });
});
