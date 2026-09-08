/**
 * AI Guesser orchestrator — same calling logic as the in-game AnAI bot.
 *
 *   first ink → debounce → snapshot → one shouted guess → wait for new ink
 *
 * Smoothing, change scores, and stale-response drops are intentionally gone.
 * Every side effect is injected so the policy stays testable.
 */

import type { WhiteboardShape } from "@/features/whiteboard/types";
import { isAbortError } from "@/lib/api";
import {
  createShapeMetricsCache,
  emptySignature,
  isEmptySignature,
  summarizeShapes,
  type ShapeMetricsCache,
} from "./changeDetector";
import { pickCommittedGuess } from "./commit";
import { resolveConfig, type AiGuesserConfig } from "./config";
import { decideCall } from "./scheduler";
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
  /** Fired with the single shouted guess of an accepted response. */
  onAcceptedGuesses?: (guesses: GuessItem[]) => void;
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

  private dirty = false;
  private turnStartedAt: number | null = null;
  private lastCallStartedAt: number | null = null;

  private inFlight = false;
  private abortController: AbortController | null = null;

  private blockedUntil: number | null = null;
  private consecutiveErrors = 0;

  private timer: IntervalToken | null = null;
  private disposed = false;
  private epoch = 0;

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
   * Feed the newest shape list. Any actual mutation marks the board dirty,
   * which is the only thing that can justify another look.
   */
  setShapes(shapes: WhiteboardShape[]): void {
    if (this.disposed) return;
    this.shapes = shapes;

    const next = summarizeShapes(shapes, this.metricsCache);
    if (next.fingerprint === this.signature.fingerprint) return;

    this.signature = next;
    this.drawingVersion += 1;
    this.state.drawingVersion = this.drawingVersion;

    if (isEmptySignature(next)) {
      this.dirty = false;
    } else {
      this.dirty = true;
      this.turnStartedAt ??= this.now();
    }
    this.syncStatus();
  }

  /**
   * Clear all AI state and invalidate anything in flight.
   * Session call count survives unless `resetSession` is set.
   */
  reset(options: { resetSession?: boolean } = {}): void {
    if (this.disposed) return;
    this.epoch += 1;
    this.abortInFlight();
    this.metricsCache.clear();

    this.shapes = [];
    this.signature = emptySignature();
    this.drawingVersion += 1;
    this.dirty = false;
    this.turnStartedAt = null;
    this.lastCallStartedAt = null;
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
      hasInk: !isEmptySignature(this.signature),
      dirty: this.dirty,
      inFlight: this.inFlight,
      callsThisDrawing: this.state.callsThisDrawing,
      turnStartedAt: this.turnStartedAt,
      blockedUntil: this.blockedUntil,
      config: this.config,
    });

    this.deps.logger?.({
      drawingVersion: this.drawingVersion,
      dirty: this.dirty,
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
    const epoch = this.epoch;
    const version = this.drawingVersion;
    const shapes = this.shapes;
    const previousCallStartedAt = this.lastCallStartedAt;

    // Consume dirty the way the server bot does: a failed look restores it.
    this.dirty = false;
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
      this.dirty = true;
      this.failed(error);
      return;
    }

    if (this.disposed) return;

    if (snapshot === null) {
      this.inFlight = false;
      this.abortController = null;
      this.lastCallStartedAt = previousCallStartedAt;
      this.syncStatus();
      return;
    }

    const input: AnalyzeInput = {
      imageBase64: snapshot.base64,
      mimeType: snapshot.mimeType,
      drawingVersion: version,
      mode: this.mode,
      previousGuesses: [...this.state.guesses.map((g) => g.answer)].sort(),
    };

    try {
      const result = await this.deps.analyze(input, controller.signal);
      this.settle(epoch, result);
    } catch (error) {
      if (epoch !== this.epoch) return;
      this.dirty = true;
      this.failed(error);
    }
  }

  private settle(epoch: number, result: AnalyzeResult): void {
    if (this.disposed || epoch !== this.epoch) return;

    this.inFlight = false;
    this.abortController = null;
    this.consecutiveErrors = 0;
    this.blockedUntil = null;

    this.state.callsThisDrawing += 1;
    this.state.callsThisSession += 1;
    this.state.errorMessage = null;
    this.state.latencyMs = result.latencyMs;
    this.state.usage = result.usage;
    this.state.model = result.model;
    this.state.line = result.line.trim() || this.state.line;
    this.state.analyzedVersion = this.drawingVersion;
    this.state.lastAnalyzedAt = this.now();
    this.state.uncertain = false;

    const committed = pickCommittedGuess(
      result.guesses,
      this.state.guesses.map((g) => g.answer),
      this.config.MIN_CONFIDENCE,
    );

    if (committed) {
      this.state.guesses = [...this.state.guesses, committed];
      this.deps.onAcceptedGuesses?.([committed]);
    }

    const top = this.state.guesses[this.state.guesses.length - 1];
    this.deps.logger?.({
      drawingVersion: this.drawingVersion,
      latency: result.latencyMs,
      shouted: committed?.answer ?? null,
      confidence: committed ? Number(committed.confidence.toFixed(2)) : null,
      latest: top?.answer ?? null,
    });

    this.syncStatus(true);
  }

  private failed(error: unknown): void {
    if (this.disposed) return;

    this.inFlight = false;
    this.abortController = null;

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
