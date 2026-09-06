/**
 * AI Guesser orchestrator.
 *
 * Owns the full pipeline state machine:
 *
 *   shapes -> signature -> change score -> call decision -> snapshot ->
 *   analyze -> staleness check -> smoothing -> state
 *
 * Every side effect (rasterizing, network, clock, timers) is injected, so the
 * whole policy is testable without a DOM or a live model.
 */

import type { WhiteboardShape } from "@/features/whiteboard/types";
import {
  changeScore,
  createShapeMetricsCache,
  emptySignature,
  isEmptySignature,
  summarizeShapes,
  type ShapeMetricsCache,
} from "./changeDetector";
import { resolveConfig, type AiGuesserConfig } from "./config";
import { decideCall } from "./scheduler";
import { isUncertain, smoothGuesses } from "./smoothing";
import {
  createInitialState,
  type AiGuesserState,
  type AiGuesserStatus,
  type AnalyzeInput,
  type AnalyzeResult,
  type CandidateMode,
  type DrawingSignature,
  type DrawingSnapshot,
  type GuessItem,
} from "./types";

export type IntervalToken = unknown;

export interface AiGuesserEngineDeps {
  /** Rasterize the board for the model. Returns null when there is nothing to send. */
  renderSnapshot: (
    shapes: WhiteboardShape[],
    size: number,
  ) => Promise<DrawingSnapshot | null>;
  analyze: (input: AnalyzeInput, signal: AbortSignal) => Promise<AnalyzeResult>;
  onState: (state: AiGuesserState) => void;
  now?: () => number;
  config?: Partial<AiGuesserConfig>;
  startInterval?: (fn: () => void, ms: number) => IntervalToken;
  stopInterval?: (token: IntervalToken) => void;
  /** Development-only structured logging. Omit in production. */
  logger?: (fields: Record<string, unknown>) => void;
  mode?: CandidateMode;
  /** Fired with the raw (unsmoothed) guesses of an accepted response. */
  onAcceptedGuesses?: (guesses: GuessItem[]) => void;
}

function isAbortError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { name?: unknown }).name === "AbortError"
  );
}

function errorMessage(error: unknown): string {
  if (typeof error === "object" && error !== null) {
    const detail = (error as { detail?: unknown }).detail;
    if (typeof detail === "string" && detail.trim()) return detail;
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message.trim()) return message;
  }
  return "AI temporarily unavailable";
}

export class AiGuesserEngine {
  private readonly deps: AiGuesserEngineDeps;
  private readonly config: AiGuesserConfig;
  private readonly now: () => number;
  private readonly startIntervalFn: (fn: () => void, ms: number) => IntervalToken;
  private readonly stopIntervalFn: (token: IntervalToken) => void;
  private readonly metricsCache: ShapeMetricsCache = createShapeMetricsCache();

  private shapes: WhiteboardShape[] = [];
  private signature: DrawingSignature = emptySignature();
  private drawingVersion = 0;

  private lastSentSignature: DrawingSignature | null = null;
  private lastCallStartedAt: number | null = null;
  private lastDrawActivityAt: number | null = null;

  private inFlight = false;
  private abortController: AbortController | null = null;

  private blockedUntil: number | null = null;
  private consecutiveErrors = 0;

  private timer: IntervalToken | null = null;
  private disposed = false;

  private mode: CandidateMode;

  private state: AiGuesserState = createInitialState();

  constructor(deps: AiGuesserEngineDeps) {
    this.deps = deps;
    this.config = resolveConfig(deps.config);
    this.now = deps.now ?? (() => Date.now());
    this.startIntervalFn =
      deps.startInterval ??
      ((fn, ms) => setInterval(fn, ms) as unknown as IntervalToken);
    this.stopIntervalFn =
      deps.stopInterval ??
      ((token) => clearInterval(token as ReturnType<typeof setInterval>));
    this.mode = deps.mode ?? "game";
  }

  getState(): AiGuesserState {
    return this.state;
  }

  getConfig(): AiGuesserConfig {
    return this.config;
  }

  /** True while a request is outstanding. Exposed for assertions. */
  isInFlight(): boolean {
    return this.inFlight;
  }

  hasTimer(): boolean {
    return this.timer !== null;
  }

  start(): void {
    if (this.disposed || this.timer !== null) return;
    this.timer = this.startIntervalFn(
      () => this.tick(),
      this.config.TICK_INTERVAL_MS,
    );
  }

  stop(): void {
    if (this.timer === null) return;
    this.stopIntervalFn(this.timer);
    this.timer = null;
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.stop();
    this.abortInFlight();
  }

  setMode(mode: CandidateMode): void {
    this.mode = mode;
  }

  /**
   * Feed the newest shape list. Any actual mutation bumps `drawingVersion`,
   * which is what invalidates in-flight responses. Worthiness is decided
   * separately, by the scheduler.
   */
  setShapes(shapes: WhiteboardShape[]): void {
    if (this.disposed) return;
    this.shapes = shapes;

    const next = summarizeShapes(shapes, this.metricsCache);
    if (next.fingerprint === this.signature.fingerprint) return;

    this.signature = next;
    this.drawingVersion += 1;
    this.state.drawingVersion = this.drawingVersion;
    this.lastDrawActivityAt = this.now();
    this.syncStatus();
  }

  /**
   * Clear all AI state and invalidate anything in flight.
   * Session call count survives unless `resetSession` is set.
   */
  reset(options: { resetSession?: boolean } = {}): void {
    if (this.disposed) return;
    this.abortInFlight();
    this.metricsCache.clear();

    this.shapes = [];
    this.signature = emptySignature();
    // Bump rather than zero: a late response for the old version must lose.
    this.drawingVersion += 1;
    this.lastSentSignature = null;
    this.lastCallStartedAt = null;
    this.lastDrawActivityAt = null;
    this.blockedUntil = null;
    this.consecutiveErrors = 0;

    const callsThisSession = options.resetSession
      ? 0
      : this.state.callsThisSession;
    this.state = {
      ...createInitialState(),
      callsThisSession,
      drawingVersion: this.drawingVersion,
    };
    this.syncStatus(true);
  }

  /** Re-evaluate the calling policy. Safe to call as often as you like. */
  tick(): void {
    if (this.disposed) return;
    const now = this.now();

    const decision = decideCall({
      now,
      signature: this.signature,
      lastSentSignature: this.lastSentSignature,
      lastCallStartedAt: this.lastCallStartedAt,
      inFlight: this.inFlight,
      lastDrawActivityAt: this.lastDrawActivityAt,
      blockedUntil: this.blockedUntil,
      config: this.config,
    });

    this.state.lastChangeScore = decision.score;

    this.deps.logger?.({
      drawingVersion: this.drawingVersion,
      changedSinceLastCall: decision.score > 0,
      changeScore: Number(decision.score.toFixed(3)),
      call: decision.call,
      reason: decision.reason,
    });

    if (decision.call) {
      void this.run(now);
      return;
    }

    this.syncStatus();
  }

  private async run(startedAt: number): Promise<void> {
    // Capture the exact drawing this call describes.
    const version = this.drawingVersion;
    const shapes = this.shapes;
    const sentSignature = this.signature;
    const previousCallStartedAt = this.lastCallStartedAt;

    // Claim the single-flight slot before any await. lastSentSignature stays
    // at the last *completed* send so a failed attempt can be retried.
    this.inFlight = true;
    this.lastCallStartedAt = startedAt;
    this.syncStatus(true);

    const controller = new AbortController();
    this.abortController = controller;

    let snapshot: DrawingSnapshot | null;
    try {
      snapshot = await this.deps.renderSnapshot(
        shapes,
        this.config.SNAPSHOT_SIZE,
      );
    } catch (error) {
      this.lastCallStartedAt = previousCallStartedAt;
      this.failed(error);
      return;
    }

    if (this.disposed) return;

    if (snapshot === null) {
      // Nothing worth sending; release the slot without burning a call.
      this.inFlight = false;
      this.abortController = null;
      this.lastCallStartedAt = previousCallStartedAt;
      this.syncStatus();
      return;
    }

    this.state.callsThisDrawing += 1;
    this.state.callsThisSession += 1;

    const input: AnalyzeInput = {
      imageBase64: snapshot.base64,
      mimeType: snapshot.mimeType,
      drawingVersion: version,
      mode: this.mode,
      previousGuesses: this.state.guesses.map((g) => g.answer),
    };

    try {
      const result = await this.deps.analyze(input, controller.signal);
      this.settle(version, sentSignature, result);
    } catch (error) {
      this.failed(error);
    }
  }

  private settle(
    version: number,
    sentSignature: DrawingSignature,
    result: AnalyzeResult,
  ): void {
    if (this.disposed) return;

    this.inFlight = false;
    this.abortController = null;
    this.consecutiveErrors = 0;
    this.blockedUntil = null;
    // Only commit after a real model response — not on snapshot/network failure.
    this.lastSentSignature = sentSignature;

    this.state.errorMessage = null;
    this.state.latencyMs = result.latencyMs;
    this.state.usage = result.usage;
    this.state.model = result.model;

    // Stale if the drawing moved on, or if the server echoed a version that
    // does not match what we asked about.
    const superseded = version !== this.drawingVersion;
    const echoMismatch = result.drawingVersion !== version;
    let stale = superseded || echoMismatch;

    if (
      stale &&
      !echoMismatch &&
      this.config.ACCEPT_STALE_BELOW_SCORE > 0 &&
      !isEmptySignature(this.signature)
    ) {
      const drift = changeScore(sentSignature, this.signature, this.config);
      if (drift < this.config.ACCEPT_STALE_BELOW_SCORE) stale = false;
    }

    if (stale) {
      this.state.staleDropped += 1;
      this.deps.logger?.({
        drawingVersion: this.drawingVersion,
        requestDrawingVersion: version,
        stale: true,
        echoMismatch,
        latency: result.latencyMs,
      });
      // Guesses intentionally untouched: never present an old answer as new.
      this.syncStatus(true);
      return;
    }

    this.state.guesses = smoothGuesses(
      this.state.guesses,
      result.guesses,
      this.config,
    );
    this.state.line = result.line.trim() || null;
    this.state.uncertain = isUncertain(this.state.guesses, this.config);
    this.state.analyzedVersion = version;
    this.state.lastAnalyzedAt = this.now();
    this.deps.onAcceptedGuesses?.(result.guesses);

    const top = this.state.guesses[0];
    this.deps.logger?.({
      drawingVersion: this.drawingVersion,
      stale: false,
      latency: result.latencyMs,
      topGuess: top?.answer ?? null,
      confidence: top ? Number(top.confidence.toFixed(2)) : null,
    });

    this.syncStatus(true);
  }

  private failed(error: unknown): void {
    if (this.disposed) return;

    this.inFlight = false;
    this.abortController = null;

    // Aborts are our own doing (reset/unmount) — not a model failure.
    if (isAbortError(error)) {
      this.syncStatus(true);
      return;
    }

    this.consecutiveErrors += 1;
    this.blockedUntil =
      this.now() +
      Math.min(
        this.config.ERROR_BACKOFF_MS * this.consecutiveErrors,
        this.config.MAX_ERROR_BACKOFF_MS,
      );
    // A single slow Gemini call should not paint the board "unavailable".
    this.state.errorMessage =
      this.consecutiveErrors >= this.config.UNAVAILABLE_AFTER_ERRORS
        ? errorMessage(error)
        : null;

    this.deps.logger?.({
      drawingVersion: this.drawingVersion,
      error: this.state.errorMessage,
      consecutiveErrors: this.consecutiveErrors,
    });

    this.syncStatus(true);
  }

  private abortInFlight(): void {
    if (this.abortController !== null) {
      this.abortController.abort();
      this.abortController = null;
    }
    this.inFlight = false;
  }

  private deriveStatus(now: number): AiGuesserStatus {
    if (this.inFlight) return "thinking";
    if (
      this.state.errorMessage !== null &&
      this.blockedUntil !== null &&
      now < this.blockedUntil
    ) {
      return "unavailable";
    }
    if (isEmptySignature(this.signature)) return "idle";
    if (
      this.state.lastAnalyzedAt !== null &&
      now - this.state.lastAnalyzedAt < this.config.STATUS_UPDATED_MS
    ) {
      return "updated";
    }
    return "watching";
  }

  /**
   * Recompute derived status and publish. Emits only when the status changed
   * (or when forced) so drawing at 30fps does not re-render the panel 30x/s.
   */
  private syncStatus(force = false): void {
    const status = this.deriveStatus(this.now());
    const changed = status !== this.state.status;
    this.state.status = status;
    if (changed || force) {
      this.state = { ...this.state };
      this.deps.onState(this.state);
    }
  }
}
