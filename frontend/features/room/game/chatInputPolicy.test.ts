import { describe, expect, it } from "vitest";
import {
  getChatInputPolicy,
  type ChatInputPolicyInput,
} from "./chatInputPolicy";

const base: ChatInputPolicyInput = {
  phase: "ROUND_ACTIVE",
  hasSelf: true,
  isDrawer: false,
  hasGuessed: false,
};

describe("getChatInputPolicy", () => {
  it("enables chat and scoring for an active guesser during ROUND_ACTIVE", () => {
    const policy = getChatInputPolicy(base);
    expect(policy.canSendChat).toBe(true);
    expect(policy.canScoreGuess).toBe(true);
    expect(policy.placeholder).toBe("Type your guess here...");
    expect(policy.disabledReason).toBeUndefined();
  });

  it("keeps correct-guesser chat enabled as private (no scoring)", () => {
    const policy = getChatInputPolicy({ ...base, hasGuessed: true });
    expect(policy.canSendChat).toBe(true);
    expect(policy.canScoreGuess).toBe(false);
    expect(policy.placeholder.toLowerCase()).toContain("private");
    expect(policy.inputHint?.toLowerCase()).toMatch(/private|drawer|guesser/);
  });

  it("disables chat for the drawer during their drawing", () => {
    const policy = getChatInputPolicy({ ...base, isDrawer: true });
    expect(policy.canSendChat).toBe(false);
    expect(policy.canScoreGuess).toBe(false);
    expect(policy.disabledReason?.toLowerCase()).toContain("drawing");
  });

  it("disables chat outside ROUND_ACTIVE", () => {
    for (const phase of [
      "WORD_SELECTION",
      "COUNTDOWN",
      "ROUND_END",
      "GAME_FINISHED",
      "LOBBY",
    ] as const) {
      const policy = getChatInputPolicy({
        ...base,
        phase,
      });
      expect(policy.canSendChat).toBe(false);
      expect(policy.canScoreGuess).toBe(false);
      expect(policy.disabledReason).toBeTruthy();
    }
  });

  it("disables chat when there is no self player", () => {
    const policy = getChatInputPolicy({ ...base, hasSelf: false });
    expect(policy.canSendChat).toBe(false);
    expect(policy.canScoreGuess).toBe(false);
  });
});
