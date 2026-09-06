import { describe, expect, it } from "vitest";
import type { WhiteboardShape } from "@/features/whiteboard/types";
import { AiGuesserEngine } from "../engine";
import { AI_GUESSER_CONFIG, type AiGuesserConfig } from "../config";
import type {
  AiGuesserState,
  AnalyzeInput,
  AnalyzeResult,
  DrawingSnapshot,
} from "../types";
import {
  BASE_STROKE,
  SECOND_STROKE,
  THIRD_STROKE,
  TINY_EXTENSION,
  deferred,
  flush,
  type Deferred,
} from "./fixtures";

const SNAPSHOT: DrawingSnapshot = {
  base64: "ZmFrZQ==",
  mimeType: "image/png",
  width: 8,
  height: 8,
};

function result(
  drawingVersion: number,
  answer = "dog",
  confidence = 0.8,
): AnalyzeResult {
  return {
    guesses: [{ answer, confidence }],
    line: "",
    model: "test-model",
    mode: "game",
    drawingVersion,
    latencyMs: 420,
    usage: null,
  };
}

function harness(config?: Partial<AiGuesserConfig>) {
  let now = 100_000;
  let timerFn: (() => void) | null = null;
  let clearedTimers = 0;

  const analyzeCalls: AnalyzeInput[] = [];
  const pending: Deferred<AnalyzeResult>[] = [];
  const states: AiGuesserState[] = [];
  const accepted: AnalyzeResult["guesses"][] = [];
  let snapshotError: Error | null = null;

  const engine = new AiGuesserEngine({
    renderSnapshot: async (): Promise<DrawingSnapshot | null> => {
      if (snapshotError) throw snapshotError;
      return SNAPSHOT;
    },
    analyze: (input) => {
      analyzeCalls.push(input);
      const d = deferred<AnalyzeResult>();
      pending.push(d);
      return d.promise;
    },
    onState: (state) => states.push(state),
    onAcceptedGuesses: (guesses) => accepted.push(guesses),
    now: () => now,
    config,
    startInterval: (fn) => {
      timerFn = fn;
      return "timer";
    },
    stopInterval: () => {
      clearedTimers += 1;
      timerFn = null;
    },
  });

  return {
    engine,
    analyzeCalls,
    pending,
    states,
    advance: (ms: number) => {
      now += ms;
    },
    fireTimer: () => timerFn?.(),
    hasTimerFn: () => timerFn !== null,
    clearedTimers: () => clearedTimers,
    failSnapshot: (error: Error) => {
      snapshotError = error;
    },
    accepted: () => accepted,
    state: () => engine.getState(),
  };
}

/** Draw enough to trip the significant-change threshold. */
async function draw(
  h: ReturnType<typeof harness>,
  shapes: WhiteboardShape[],
): Promise<void> {
  h.engine.setShapes(shapes);
  h.engine.tick();
  await flush();
}

describe("AiGuesserEngine", () => {
  it("does not call the model when there is no drawing", async () => {
    const h = harness();
    await draw(h, []);
    expect(h.analyzeCalls).toHaveLength(0);
    expect(h.state().status).toBe("idle");
  });

  it("calls the model once ink appears", async () => {
    const h = harness();
    await draw(h, [BASE_STROKE]);

    expect(h.analyzeCalls).toHaveLength(1);
    expect(h.analyzeCalls[0].drawingVersion).toBe(1);
    expect(h.analyzeCalls[0].imageBase64).toBe(SNAPSHOT.base64);
    expect(h.state().status).toBe("thinking");
  });

  it("keeps exactly one request in flight", async () => {
    const h = harness();
    await draw(h, [BASE_STROKE]);
    expect(h.analyzeCalls).toHaveLength(1);

    h.advance(10_000);
    await draw(h, [BASE_STROKE, SECOND_STROKE]);

    expect(h.engine.isInFlight()).toBe(true);
    expect(h.analyzeCalls).toHaveLength(1);
  });

  it("does not create a request storm while the player keeps drawing", async () => {
    const h = harness();
    await draw(h, [BASE_STROKE]);

    for (let i = 0; i < 25; i += 1) {
      h.advance(500);
      h.engine.setShapes([
        BASE_STROKE,
        { ...SECOND_STROKE, id: `extra-${i}` },
      ]);
      h.engine.tick();
      await flush();
    }

    expect(h.analyzeCalls).toHaveLength(1);
  });

  it("applies a fresh result and smooths confidence upward", async () => {
    const h = harness();
    await draw(h, [BASE_STROKE]);

    h.pending[0].resolve(result(1, "dog", 0.6));
    await flush();

    expect(h.state().guesses).toHaveLength(1);
    expect(h.state().guesses[0].answer).toBe("dog");
    expect(h.state().guesses[0].confidence).toBeCloseTo(0.6, 5);
    expect(h.state().analyzedVersion).toBe(1);
    expect(h.state().latencyMs).toBe(420);
    expect(h.state().status).toBe("updated");

    // Second, more confident reading nudges the smoothed value up.
    h.advance(5000);
    await draw(h, [BASE_STROKE, SECOND_STROKE]);
    h.pending[1].resolve(
      result(h.analyzeCalls[1].drawingVersion, "dog", 0.9),
    );
    await flush();

    expect(h.state().guesses[0].confidence).toBeGreaterThan(0.6);
    expect(h.state().guesses[0].confidence).toBeLessThan(0.9);
  });

  it("accepts a slightly stale response when the drawing barely changed", async () => {
    const h = harness();
    await draw(h, [BASE_STROKE]);
    const requestedVersion = h.analyzeCalls[0].drawingVersion;

    h.engine.setShapes([TINY_EXTENSION]);
    expect(h.state().drawingVersion).toBeGreaterThan(requestedVersion);

    h.pending[0].resolve(result(requestedVersion, "dog", 0.8));
    await flush();

    expect(h.state().guesses[0]?.answer).toBe("dog");
    expect(h.state().staleDropped).toBe(0);
    expect(h.accepted()).toEqual([[{ answer: "dog", confidence: 0.8 }]]);
  });

  it("rejects a stale response instead of showing it as current", async () => {
    const h = harness();
    await draw(h, [BASE_STROKE]);
    const requestedVersion = h.analyzeCalls[0].drawingVersion;

    // Player keeps drawing while the request is in flight.
    h.engine.setShapes([BASE_STROKE, SECOND_STROKE]);
    h.engine.setShapes([BASE_STROKE, SECOND_STROKE, THIRD_STROKE]);
    expect(h.state().drawingVersion).toBeGreaterThan(requestedVersion);

    h.pending[0].resolve(result(requestedVersion, "dog", 0.95));
    await flush();

    expect(h.state().guesses).toHaveLength(0);
    expect(h.state().staleDropped).toBe(1);
    expect(h.state().analyzedVersion).toBeNull();
    expect(h.state().status).not.toBe("updated");
  });

  it("analyzes the newest drawing after an outdated request finishes", async () => {
    const h = harness();
    await draw(h, [BASE_STROKE]);

    h.engine.setShapes([BASE_STROKE, SECOND_STROKE, THIRD_STROKE]);
    h.pending[0].resolve(result(1));
    await flush();

    expect(h.analyzeCalls).toHaveLength(1);

    h.advance(AI_GUESSER_CONFIG.MIN_CALL_INTERVAL_MS);
    h.engine.tick();
    await flush();

    expect(h.analyzeCalls).toHaveLength(2);
    expect(h.analyzeCalls[1].drawingVersion).toBe(h.state().drawingVersion);

    h.pending[1].resolve(result(h.analyzeCalls[1].drawingVersion, "cat", 0.7));
    await flush();

    expect(h.state().guesses[0].answer).toBe("cat");
    expect(h.state().analyzedVersion).toBe(h.analyzeCalls[1].drawingVersion);
    // Exactly one response was dropped: the outdated one.
    expect(h.state().staleDropped).toBe(1);
  });

  it("rejects a response whose echoed version does not match the request", async () => {
    const h = harness();
    await draw(h, [BASE_STROKE]);

    // Server echoes the wrong version — treat as untrustworthy.
    h.pending[0].resolve(result(999, "dog", 0.9));
    await flush();

    expect(h.state().guesses).toHaveLength(0);
    expect(h.state().staleDropped).toBe(1);
  });

  it("survives a model failure and keeps watching", async () => {
    const h = harness({ UNAVAILABLE_AFTER_ERRORS: 1 });
    await draw(h, [BASE_STROKE]);

    h.pending[0].reject(new Error("Gemini exploded"));
    await flush();

    expect(h.state().status).toBe("unavailable");
    expect(h.state().errorMessage).toBe("Gemini exploded");
    expect(h.engine.isInFlight()).toBe(false);

    // Drawing still tracked; a retry happens once the backoff expires.
    h.advance(60_000);
    h.engine.setShapes([BASE_STROKE, SECOND_STROKE]);
    h.engine.tick();
    await flush();

    expect(h.analyzeCalls).toHaveLength(2);
  });

  it("retries the same drawing after a failure once backoff expires", async () => {
    const h = harness();
    await draw(h, [BASE_STROKE]);
    expect(h.analyzeCalls).toHaveLength(1);

    h.pending[0].reject(new Error("timeout 1"));
    await flush();

    h.advance(60_000);
    h.engine.tick();
    await flush();

    expect(h.analyzeCalls).toHaveLength(2);
    expect(h.analyzeCalls[1].drawingVersion).toBe(
      h.analyzeCalls[0].drawingVersion,
    );
  });

  it("does not mark the AI unavailable after a single timeout", async () => {
    const h = harness();
    await draw(h, [BASE_STROKE]);
    h.pending[0].reject(new Error("AI guesser timed out"));
    await flush();

    expect(h.state().status).toBe("watching");
    expect(h.state().errorMessage).toBeNull();
    expect(h.engine.isInFlight()).toBe(false);
  });

  it("marks the AI unavailable after repeated failures", async () => {
    const h = harness();
    await draw(h, [BASE_STROKE]);
    h.pending[0].reject(new Error("timeout 1"));
    await flush();

    h.advance(60_000);
    h.engine.setShapes([BASE_STROKE, SECOND_STROKE]);
    h.engine.tick();
    await flush();
    h.pending[1].reject(new Error("timeout 2"));
    await flush();

    expect(h.state().status).toBe("unavailable");
    expect(h.state().errorMessage).toBe("timeout 2");
  });

  it("blocks retries during the failure backoff window", async () => {
    const h = harness();
    await draw(h, [BASE_STROKE]);
    h.pending[0].reject(new Error("nope"));
    await flush();

    h.advance(500);
    h.engine.setShapes([BASE_STROKE, SECOND_STROKE, THIRD_STROKE]);
    h.engine.tick();
    await flush();

    expect(h.analyzeCalls).toHaveLength(1);
  });

  it("treats a timeout like any other failure and frees the in-flight slot", async () => {
    const h = harness({ UNAVAILABLE_AFTER_ERRORS: 1 });
    await draw(h, [BASE_STROKE]);

    h.pending[0].reject(new Error("AI guesser timed out"));
    await flush();

    expect(h.engine.isInFlight()).toBe(false);
    expect(h.state().status).toBe("unavailable");

    h.advance(60_000);
    h.engine.setShapes([BASE_STROKE, SECOND_STROKE]);
    h.engine.tick();
    await flush();
    expect(h.analyzeCalls).toHaveLength(2);
  });

  it("surfaces a snapshot failure without breaking the pipeline", async () => {
    const h = harness({ UNAVAILABLE_AFTER_ERRORS: 1 });
    h.failSnapshot(new Error("canvas unavailable"));
    await draw(h, [BASE_STROKE]);

    expect(h.analyzeCalls).toHaveLength(0);
    expect(h.state().status).toBe("unavailable");
    expect(h.engine.isInFlight()).toBe(false);
  });

  it("invalidates previous AI state on reset", async () => {
    const h = harness();
    await draw(h, [BASE_STROKE]);
    h.pending[0].resolve(result(1, "dog", 0.9));
    await flush();
    expect(h.state().guesses).toHaveLength(1);
    expect(h.state().callsThisDrawing).toBe(1);

    h.engine.reset();

    expect(h.state().guesses).toHaveLength(0);
    expect(h.state().callsThisDrawing).toBe(0);
    expect(h.state().analyzedVersion).toBeNull();
    expect(h.state().latencyMs).toBeNull();
    expect(h.state().status).toBe("idle");
    // Session total is cumulative across drawings.
    expect(h.state().callsThisSession).toBe(1);
  });

  it("discards an in-flight response that resolves after a reset", async () => {
    const h = harness();
    await draw(h, [BASE_STROKE]);
    const version = h.analyzeCalls[0].drawingVersion;

    h.engine.reset();
    h.pending[0].resolve(result(version, "dog", 0.99));
    await flush();

    expect(h.state().guesses).toHaveLength(0);
    expect(h.state().analyzedVersion).toBeNull();
  });

  it("zeroes the session counter on a session reset", async () => {
    const h = harness();
    await draw(h, [BASE_STROKE]);
    h.pending[0].resolve(result(1));
    await flush();

    h.engine.reset({ resetSession: true });
    expect(h.state().callsThisSession).toBe(0);
  });

  it("cleans up its timer on dispose", () => {
    const h = harness();
    h.engine.start();
    expect(h.engine.hasTimer()).toBe(true);
    expect(h.hasTimerFn()).toBe(true);

    h.engine.dispose();

    expect(h.engine.hasTimer()).toBe(false);
    expect(h.hasTimerFn()).toBe(false);
    expect(h.clearedTimers()).toBe(1);
  });

  it("starts only one timer even if start is called twice", () => {
    const h = harness();
    h.engine.start();
    h.engine.start();
    h.engine.dispose();
    expect(h.clearedTimers()).toBe(1);
  });

  it("emits no state and makes no calls after dispose", async () => {
    const h = harness();
    h.engine.start();
    await draw(h, [BASE_STROKE]);

    const emitted = h.states.length;
    h.engine.dispose();

    h.pending[0].resolve(result(1, "dog", 0.9));
    await flush();

    h.engine.setShapes([BASE_STROKE, SECOND_STROKE]);
    h.engine.tick();
    await flush();

    expect(h.states.length).toBe(emitted);
    expect(h.analyzeCalls).toHaveLength(1);
  });

  it("drives calls from its own timer once started", async () => {
    const h = harness();
    h.engine.start();
    h.engine.setShapes([BASE_STROKE]);

    h.fireTimer();
    await flush();

    expect(h.analyzeCalls).toHaveLength(1);
    h.engine.dispose();
  });

  it("forwards mode to the model call without a candidate list", async () => {
    const h = harness();
    h.engine.setMode("open");
    await draw(h, [BASE_STROKE]);

    expect(h.analyzeCalls[0].mode).toBe("open");
    expect(h.analyzeCalls[0]).not.toHaveProperty("candidates");
  });

  it("stores the spoken line from an accepted response", async () => {
    const h = harness();
    await draw(h, [BASE_STROKE]);
    h.pending[0].resolve({
      ...result(1, "dog", 0.8),
      line: "Wait, is that a tail? I'm going with dog.",
    });
    await flush();

    expect(h.state().line).toBe("Wait, is that a tail? I'm going with dog.");
    h.engine.reset();
    expect(h.state().line).toBeNull();
  });

  it("passes previous guesses as context on later calls", async () => {
    const h = harness();
    await draw(h, [BASE_STROKE]);
    h.pending[0].resolve(result(1, "dog", 0.8));
    await flush();

    h.advance(5000);
    await draw(h, [BASE_STROKE, SECOND_STROKE]);

    expect(h.analyzeCalls[1].previousGuesses).toEqual(["dog"]);
  });
});
