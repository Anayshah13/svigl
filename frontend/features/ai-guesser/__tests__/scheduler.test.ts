import { describe, expect, it } from "vitest";
import { summarizeShapes } from "../changeDetector";
import { AI_GUESSER_CONFIG } from "../config";
import { decideCall, type CallDecisionInput } from "../scheduler";
import {
  BASE_STROKE,
  INNER_STROKE,
  SECOND_STROKE,
  THIRD_STROKE,
  TINY_EXTENSION,
} from "./fixtures";

const config = AI_GUESSER_CONFIG;
const NOW = 100_000;
/** Past the hard floor, still short of the preferred cadence. */
const AFTER_MIN_MS = config.MIN_CALL_INTERVAL_MS + 200;

const EMPTY = summarizeShapes([]);
const ONE = summarizeShapes([BASE_STROKE]);
const ONE_EXTENDED = summarizeShapes([TINY_EXTENSION]);
/** Moderate: one new shape, no bounding-box growth. */
const MODERATE = summarizeShapes([BASE_STROKE, INNER_STROKE]);
/** Dramatic: new shapes that also expand the drawing's footprint. */
const THREE = summarizeShapes([BASE_STROKE, SECOND_STROKE, THIRD_STROKE]);

function input(overrides: Partial<CallDecisionInput> = {}): CallDecisionInput {
  return {
    now: NOW,
    signature: ONE,
    lastSentSignature: null,
    lastCallStartedAt: null,
    inFlight: false,
    lastDrawActivityAt: NOW,
    blockedUntil: null,
    config,
    ...overrides,
  };
}

describe("decideCall", () => {
  it("does not call when there is no drawing", () => {
    const decision = decideCall(input({ signature: EMPTY }));
    expect(decision).toEqual({ call: false, reason: "empty", score: 0 });
  });

  it("does not call when the drawing is unchanged since the last snapshot", () => {
    const decision = decideCall(
      input({
        signature: ONE,
        lastSentSignature: ONE,
        lastCallStartedAt: NOW - 30_000,
      }),
    );
    expect(decision.call).toBe(false);
    expect(decision.reason).toBe("unchanged");
  });

  it("does not call immediately for a tiny change", () => {
    const decision = decideCall(
      input({
        signature: ONE_EXTENDED,
        lastSentSignature: ONE,
        lastCallStartedAt: NOW - AFTER_MIN_MS,
      }),
    );
    expect(decision.call).toBe(false);
    expect(decision.reason).toBe("below-threshold");
  });

  it("calls on first ink", () => {
    const decision = decideCall(input({ signature: ONE }));
    expect(decision.call).toBe(true);
    expect(decision.score).toBe(1);
  });

  it("calls for a meaningful change once the target cadence has passed", () => {
    const decision = decideCall(
      input({
        signature: MODERATE,
        lastSentSignature: ONE,
        lastCallStartedAt: NOW - config.TARGET_CALL_INTERVAL_MS,
      }),
    );
    expect(decision.call).toBe(true);
    expect(decision.reason).toBe("target-cadence");
  });

  it("holds a moderate change until the target cadence arrives", () => {
    const decision = decideCall(
      input({
        signature: MODERATE,
        lastSentSignature: ONE,
        lastCallStartedAt: NOW - AFTER_MIN_MS,
        // Still drawing, so the settled shortcut does not apply.
        lastDrawActivityAt: NOW - 10,
      }),
    );
    expect(decision.call).toBe(false);
    expect(decision.reason).toBe("below-threshold");
  });

  it("allows an early call for a significant change, past the floor", () => {
    const decision = decideCall(
      input({
        signature: THREE,
        lastSentSignature: ONE,
        // Between MIN and TARGET: only a big change gets through here.
        lastCallStartedAt: NOW - AFTER_MIN_MS,
      }),
    );
    expect(decision.call).toBe(true);
    expect(decision.reason).toBe("significant-change");
  });

  it("enforces the minimum interval even for a significant change", () => {
    const decision = decideCall(
      input({
        signature: THREE,
        lastSentSignature: ONE,
        lastCallStartedAt: NOW - 500,
      }),
    );
    expect(decision.call).toBe(false);
    expect(decision.reason).toBe("cooldown");
  });

  it("analyzes a settled drawing without waiting for the full target interval", () => {
    const decision = decideCall(
      input({
        signature: MODERATE,
        lastSentSignature: ONE,
        lastCallStartedAt: NOW - AFTER_MIN_MS,
        lastDrawActivityAt: NOW - config.IDLE_SETTLE_MS,
      }),
    );
    expect(decision.call).toBe(true);
    expect(decision.reason).toBe("settled");
  });

  it("keeps waiting while the player is still actively drawing", () => {
    const decision = decideCall(
      input({
        signature: ONE_EXTENDED,
        lastSentSignature: ONE,
        lastCallStartedAt: NOW - AFTER_MIN_MS,
        lastDrawActivityAt: NOW - 50,
      }),
    );
    expect(decision.call).toBe(false);
  });

  it("accepts a tiny change once the panel has gone cold", () => {
    const decision = decideCall(
      input({
        signature: ONE_EXTENDED,
        lastSentSignature: ONE,
        lastCallStartedAt: NOW - config.MAX_IDLE_INTERVAL_MS,
      }),
    );
    expect(decision.call).toBe(true);
    expect(decision.reason).toBe("idle-refresh");
  });

  it("never calls while a request is in flight", () => {
    const decision = decideCall(
      input({
        signature: THREE,
        lastSentSignature: ONE,
        lastCallStartedAt: NOW - 30_000,
        inFlight: true,
      }),
    );
    expect(decision.call).toBe(false);
    expect(decision.reason).toBe("in-flight");
  });

  it("respects the post-failure backoff window", () => {
    const decision = decideCall(
      input({
        signature: THREE,
        lastSentSignature: ONE,
        lastCallStartedAt: NOW - 30_000,
        blockedUntil: NOW + 1000,
      }),
    );
    expect(decision.call).toBe(false);
    expect(decision.reason).toBe("error-backoff");
  });

  it("resumes once the backoff window expires", () => {
    const decision = decideCall(
      input({
        signature: THREE,
        lastSentSignature: ONE,
        lastCallStartedAt: NOW - 30_000,
        blockedUntil: NOW - 1,
      }),
    );
    expect(decision.call).toBe(true);
  });
});
