import { describe, expect, it } from "vitest";
import { AI_GUESSER_CONFIG } from "../config";
import { isUncertain, smoothGuesses } from "../smoothing";
import type { GuessItem } from "../types";

const config = AI_GUESSER_CONFIG;

describe("smoothGuesses", () => {
  it("adopts the first reading verbatim", () => {
    const out = smoothGuesses([], [{ answer: "dog", confidence: 0.62 }], config);
    expect(out).toEqual([{ answer: "dog", confidence: 0.62 }]);
  });

  it("climbs steadily as the model grows more confident", () => {
    let state: GuessItem[] = [];
    const readings = [0.62, 0.71, 0.79];

    for (const confidence of readings) {
      state = smoothGuesses(state, [{ answer: "dog", confidence }], config);
    }

    expect(state[0].answer).toBe("dog");
    // Monotonically rising, and tracking toward the latest reading.
    expect(state[0].confidence).toBeGreaterThan(0.7);
    expect(state[0].confidence).toBeLessThanOrEqual(0.79);
  });

  it("does not let a single flicker flip the leader", () => {
    let state = smoothGuesses(
      [],
      [
        { answer: "dog", confidence: 0.8 },
        { answer: "cat", confidence: 0.1 },
      ],
      config,
    );

    // One noisy call where cat edges ahead.
    state = smoothGuesses(
      state,
      [
        { answer: "cat", confidence: 0.55 },
        { answer: "dog", confidence: 0.45 },
      ],
      config,
    );

    expect(state[0].answer).toBe("dog");
  });

  it("decays answers the model stopped reporting", () => {
    let state = smoothGuesses(
      [],
      [
        { answer: "dog", confidence: 0.7 },
        { answer: "wolf", confidence: 0.3 },
      ],
      config,
    );

    state = smoothGuesses(state, [{ answer: "dog", confidence: 0.8 }], config);

    const wolf = state.find((g) => g.answer === "wolf");
    expect(wolf?.confidence).toBeCloseTo(0.3 * config.SMOOTHING_DECAY, 5);
  });

  it("drops answers once they decay past the floor", () => {
    // Chosen so one decay step lands under SMOOTHING_MIN_KEEP.
    const start = config.SMOOTHING_MIN_KEEP / config.SMOOTHING_DECAY - 0.001;
    let state: GuessItem[] = [{ answer: "fox", confidence: start }];
    state = smoothGuesses(state, [{ answer: "dog", confidence: 0.9 }], config);
    expect(state.find((g) => g.answer === "fox")).toBeUndefined();
  });

  it("caps the list at MAX_GUESSES, keeping the strongest", () => {
    const state = smoothGuesses(
      [],
      [
        { answer: "a", confidence: 0.5 },
        { answer: "b", confidence: 0.4 },
        { answer: "c", confidence: 0.3 },
        { answer: "d", confidence: 0.2 },
      ],
      config,
    );
    expect(state).toHaveLength(config.MAX_GUESSES);
    expect(state.map((g) => g.answer)).toEqual(["a", "b", "c"]);
  });

  it("merges answers that differ only by case", () => {
    let state = smoothGuesses([], [{ answer: "Dog", confidence: 0.6 }], config);
    state = smoothGuesses(state, [{ answer: "dog", confidence: 0.8 }], config);
    expect(state).toHaveLength(1);
    expect(state[0].confidence).toBeGreaterThan(0.6);
  });

  it("keeps confidences within 0..1", () => {
    const state = smoothGuesses(
      [],
      [
        { answer: "dog", confidence: 5 },
        { answer: "cat", confidence: -2 },
      ],
      config,
    );
    for (const guess of state) {
      expect(guess.confidence).toBeGreaterThanOrEqual(0);
      expect(guess.confidence).toBeLessThanOrEqual(1);
    }
  });
});

describe("isUncertain", () => {
  it("is uncertain with no guesses", () => {
    expect(isUncertain([], config)).toBe(true);
  });

  it("is uncertain when the leader is weak", () => {
    expect(isUncertain([{ answer: "dog", confidence: 0.2 }], config)).toBe(true);
  });

  it("is uncertain when the top two are close", () => {
    expect(
      isUncertain(
        [
          { answer: "dog", confidence: 0.42 },
          { answer: "car", confidence: 0.39 },
        ],
        config,
      ),
    ).toBe(true);
  });

  it("is confident with a clear leader", () => {
    expect(
      isUncertain(
        [
          { answer: "dog", confidence: 0.79 },
          { answer: "wolf", confidence: 0.14 },
        ],
        config,
      ),
    ).toBe(false);
  });
});
