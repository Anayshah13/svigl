import { describe, expect, it } from "vitest";
import { AI_GUESSER_CONFIG } from "../config";
import { decideCall, type CallDecisionInput } from "../scheduler";

const config = AI_GUESSER_CONFIG;
const NOW = 100_000;

function input(overrides: Partial<CallDecisionInput> = {}): CallDecisionInput {
  return {
    now: NOW,
    hasInk: true,
    dirty: true,
    inFlight: false,
    callsThisDrawing: 0,
    turnStartedAt: NOW - config.DEBOUNCE_MS,
    blockedUntil: null,
    config,
    ...overrides,
  };
}

describe("decideCall", () => {
  it("does not call when there is no drawing", () => {
    expect(decideCall(input({ hasInk: false, dirty: false }))).toEqual({
      call: false,
      reason: "empty",
    });
  });

  it("does not call when the board has not changed", () => {
    expect(
      decideCall(
        input({
          dirty: false,
          callsThisDrawing: 1,
        }),
      ),
    ).toEqual({ call: false, reason: "unchanged" });
  });

  it("waits out the first-look debounce", () => {
    const decision = decideCall(
      input({
        turnStartedAt: NOW - 500,
        callsThisDrawing: 0,
      }),
    );
    expect(decision).toEqual({ call: false, reason: "debounce" });
  });

  it("calls on first ink once the debounce has elapsed", () => {
    const decision = decideCall(input());
    expect(decision).toEqual({ call: true, reason: "first-look" });
  });

  it("calls immediately when the board is dirty after the first look", () => {
    const decision = decideCall(
      input({
        callsThisDrawing: 1,
        turnStartedAt: NOW - 30_000,
      }),
    );
    expect(decision).toEqual({ call: true, reason: "canvas-dirty" });
  });

  it("never calls while a request is in flight", () => {
    expect(decideCall(input({ inFlight: true }))).toEqual({
      call: false,
      reason: "in-flight",
    });
  });

  it("stops after the per-turn call cap", () => {
    expect(
      decideCall(
        input({
          callsThisDrawing: config.MAX_CALLS_PER_TURN,
        }),
      ),
    ).toEqual({ call: false, reason: "max-calls" });
  });

  it("respects the post-failure backoff window", () => {
    expect(
      decideCall(
        input({
          blockedUntil: NOW + 1000,
        }),
      ),
    ).toEqual({ call: false, reason: "error-backoff" });
  });

  it("resumes once the backoff window expires", () => {
    expect(
      decideCall(
        input({
          blockedUntil: NOW - 1,
        }),
      ),
    ).toEqual({ call: true, reason: "first-look" });
  });
});
