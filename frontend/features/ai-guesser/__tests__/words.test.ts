import { describe, expect, it } from "vitest";
import {
  AI_GUESSER_CANDIDATE_LIMIT,
  AI_GUESSER_DECOYS,
  AI_GUESSER_WORDS,
  answersMatch,
  buildAiCandidateList,
  guessesMatchSecret,
  normalizeAnswer,
  pickNextWord,
} from "../words";

describe("AI_GUESSER_WORDS", () => {
  it("has at least 100 unique words", () => {
    const unique = new Set(AI_GUESSER_WORDS.map((w) => w.toLowerCase()));
    expect(AI_GUESSER_WORDS.length).toBeGreaterThanOrEqual(100);
    expect(unique.size).toBe(AI_GUESSER_WORDS.length);
  });
});

describe("answersMatch", () => {
  it("matches ignoring case, hyphens, and a leading article", () => {
    expect(answersMatch("Spider-Man", "spider-man")).toBe(true);
    expect(answersMatch("a dog", "dog")).toBe(true);
    expect(answersMatch("DOG", "dog")).toBe(true);
  });

  it("does not match a different list word", () => {
    expect(answersMatch("cat", "dog")).toBe(false);
    expect(answersMatch("hot dog", "dog")).toBe(false);
    expect(answersMatch("hotdog", "hot dog")).toBe(false);
  });

  it("does not treat a subtype or near-miss as the secret", () => {
    expect(answersMatch("golden retriever", "dog")).toBe(false);
    expect(answersMatch("puppy", "dog")).toBe(false);
  });
});

describe("guessesMatchSecret", () => {
  it("scores when any of the top guesses is the secret", () => {
    expect(
      guessesMatchSecret(
        [
          { answer: "wolf" },
          { answer: "dog" },
        ],
        "dog",
      ),
    ).toBe(true);
    expect(guessesMatchSecret([{ answer: "cat" }], "dog")).toBe(false);
  });
});

describe("AI_GUESSER_DECOYS", () => {
  it("does not overlap the playable secret list", () => {
    const secrets = new Set(AI_GUESSER_WORDS.map((w) => normalizeAnswer(w)));
    const overlap = AI_GUESSER_DECOYS.filter((w) => secrets.has(normalizeAnswer(w)));
    expect(overlap).toEqual([]);
  });
});

describe("buildAiCandidateList", () => {
  it("always includes the secret and mixes in decoys, within the cap", () => {
    const list = buildAiCandidateList(
      "dog",
      AI_GUESSER_WORDS,
      AI_GUESSER_DECOYS,
      () => 0,
    );
    const normalized = new Set(list.map((w) => normalizeAnswer(w)));
    expect(normalized.has("dog")).toBe(true);
    expect(list.length).toBe(AI_GUESSER_CANDIDATE_LIMIT);
    expect(list.length).toBeLessThan(AI_GUESSER_WORDS.length);
    expect(
      list.some((word) =>
        AI_GUESSER_DECOYS.some((decoy) => normalizeAnswer(decoy) === normalizeAnswer(word)),
      ),
    ).toBe(true);
  });

  it("honors a smaller limit and still keeps the secret", () => {
    const list = buildAiCandidateList(
      "dog",
      ["dog", "cat", "fish", "bird"],
      ["puppy", "kitten"],
      () => 0,
      4,
    );
    expect(list).toHaveLength(4);
    expect(list.map((word) => normalizeAnswer(word))).toContain("dog");
  });

  it("never promotes a decoy into the secret pool", () => {
    expect(AI_GUESSER_WORDS).not.toContain("puppy");
    expect(AI_GUESSER_DECOYS).toContain("puppy");
  });
});

describe("pickNextWord", () => {
  it("avoids repeating the current word when others exist", () => {
    const next = pickNextWord(["dog", "cat"], "dog", () => 0);
    expect(next).toBe("cat");
  });

  it("falls back if the list has only the excluded word", () => {
    expect(pickNextWord(["dog"], "dog", () => 0)).toBe("dog");
  });
});
