/**
 * Clock-driven reveal engine.
 *
 * Actions are remapped into a short 1–5s window (by event count), then
 * playback can run at 0.5x / 1x / 2x / 4x against that compressed timeline.
 * Shape updates stay imperative — no React state per stroke.
 */

import type { WhiteboardShape } from "@/features/whiteboard/types";
import { applyReplayEvent } from "./applyEvent";
import { remapEventsForHover } from "./duration";
import type { ReplayEvent, ReplayPlaybackSpeed } from "./types";

export type ReplayEngineStatus = "idle" | "playing" | "paused" | "ended";

export interface ReplayEngineSnapshot {
  status: ReplayEngineStatus;
  speed: ReplayPlaybackSpeed;
  clockMs: number;
  durationMs: number;
  eventIndex: number;
  eventCount: number;
}

export type ReplayEngineListener = (snapshot: ReplayEngineSnapshot) => void;
export type ReplayShapesListener = (shapes: readonly WhiteboardShape[]) => void;

export class ReplayEngine {
  private events: ReplayEvent[] = [];
  private shapes: WhiteboardShape[] = [];
  private eventIndex = 0;
  private clockMs = 0;
  private durationMs = 0;
  private speed: ReplayPlaybackSpeed = 1;
  private status: ReplayEngineStatus = "idle";
  private rafId: number | null = null;
  private lastFrameWall = 0;
  private readonly controlListeners = new Set<ReplayEngineListener>();
  private readonly shapesListeners = new Set<ReplayShapesListener>();

  /** Compress actions into the 1–5s hover/player window. */
  load(events: readonly ReplayEvent[]): void {
    this.stopRaf();
    this.events = remapEventsForHover(events);
    this.durationMs =
      this.events.length > 0 ? this.events[this.events.length - 1]!.t : 0;
    this.restart(false);
  }

  subscribe(listener: ReplayEngineListener): () => void {
    this.controlListeners.add(listener);
    listener(this.snapshot());
    return () => this.controlListeners.delete(listener);
  }

  onShapes(listener: ReplayShapesListener): () => void {
    this.shapesListeners.add(listener);
    listener(this.shapes);
    return () => this.shapesListeners.delete(listener);
  }

  snapshot(): ReplayEngineSnapshot {
    return {
      status: this.status,
      speed: this.speed,
      clockMs: this.clockMs,
      durationMs: this.durationMs,
      eventIndex: this.eventIndex,
      eventCount: this.events.length,
    };
  }

  play(): void {
    if (this.events.length === 0) return;
    if (this.status === "ended") {
      this.restart(false);
    }
    if (this.status === "playing") return;
    this.status = "playing";
    this.lastFrameWall = performance.now();
    this.emitControls();
    this.startRaf();
  }

  pause(): void {
    if (this.status !== "playing") return;
    this.status = "paused";
    this.stopRaf();
    this.emitControls();
  }

  /** Clear buffer and optionally auto-play (hover leave / restart button). */
  stop(): void {
    this.stopRaf();
    this.shapes = [];
    this.eventIndex = 0;
    this.clockMs = 0;
    this.status = "idle";
    this.emitShapes();
    this.emitControls();
  }

  restart(autoPlay = true): void {
    this.stopRaf();
    this.shapes = [];
    this.eventIndex = 0;
    this.clockMs = 0;
    this.status = "idle";
    this.emitShapes();
    this.emitControls();
    if (autoPlay && this.events.length > 0) {
      this.play();
    }
  }

  setSpeed(speed: ReplayPlaybackSpeed): void {
    if (this.speed === speed) return;
    this.speed = speed;
    this.emitControls();
  }

  dispose(): void {
    this.stopRaf();
    this.controlListeners.clear();
    this.shapesListeners.clear();
  }

  private startRaf(): void {
    if (this.rafId != null) return;
    const tick = (now: number) => {
      this.rafId = null;
      if (this.status !== "playing") return;
      const dt = Math.min(64, now - this.lastFrameWall);
      this.lastFrameWall = now;
      this.advance(dt * this.speed);
      if (this.status === "playing") {
        this.rafId = requestAnimationFrame(tick);
      }
    };
    this.rafId = requestAnimationFrame(tick);
  }

  private stopRaf(): void {
    if (this.rafId != null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  private advance(deltaMs: number): void {
    const prev = this.clockMs;
    this.clockMs += deltaMs;
    let applied = false;
    while (
      this.eventIndex < this.events.length &&
      this.events[this.eventIndex]!.t <= this.clockMs
    ) {
      this.shapes = applyReplayEvent(this.shapes, this.events[this.eventIndex]!);
      this.eventIndex += 1;
      applied = true;
    }
    if (applied) this.emitShapes();

    if (
      this.eventIndex >= this.events.length &&
      this.clockMs >= this.durationMs
    ) {
      this.clockMs = this.durationMs;
      this.status = "ended";
      this.stopRaf();
      this.emitControls();
      return;
    }

    if (Math.floor(this.clockMs / 100) !== Math.floor(prev / 100)) {
      this.emitControls();
    }
  }

  private emitControls(): void {
    const snap = this.snapshot();
    for (const listener of this.controlListeners) listener(snap);
  }

  private emitShapes(): void {
    for (const listener of this.shapesListeners) listener(this.shapes);
  }
}
