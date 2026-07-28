"use client";

/**
 * Full replay player with transport controls.
 *
 * Timeline is compressed to 1–5s by action count; speed chips multiply that
 * window (2x finishes a 5s reveal in ~2.5s). No seeking/scrubbing.
 */

import * as React from "react";
import { WHITEBOARD_VIEWBOX } from "@/features/whiteboard/types";
import { cn } from "@/lib/cn";
import { fetchDrawingReplay, fetchGameReplay } from "@/services/replay";
import {
  ReplayEngine,
  type ReplayEngineSnapshot,
} from "./engine";
import { ReplaySurface } from "./ReplaySurface";
import {
  REPLAY_SPEEDS,
  type DrawingReplay,
  type ReplayEvent,
  type ReplayPlaybackSpeed,
} from "./types";

function formatClock(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export interface ReplayPlayerProps {
  events?: readonly ReplayEvent[];
  drawingId?: string;
  gameId?: string;
  initialDrawingIndex?: number;
  className?: string;
  autoPlay?: boolean;
  compact?: boolean;
  onDrawingChange?: (drawing: DrawingReplay, index: number) => void;
}

export function ReplayPlayer({
  events: eventsProp,
  drawingId,
  gameId,
  initialDrawingIndex = 0,
  className,
  autoPlay = true,
  compact = false,
  onDrawingChange,
}: ReplayPlayerProps) {
  const engineRef = React.useRef<ReplayEngine | null>(null);
  if (engineRef.current == null) {
    engineRef.current = new ReplayEngine();
  }
  const engine = engineRef.current;

  const [drawings, setDrawings] = React.useState<DrawingReplay[]>([]);
  const [drawingIndex, setDrawingIndex] = React.useState(initialDrawingIndex);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [snap, setSnap] = React.useState<ReplayEngineSnapshot>(() =>
    engine.snapshot(),
  );

  React.useEffect(() => engine.subscribe(setSnap), [engine]);
  React.useEffect(() => () => engine.dispose(), [engine]);

  React.useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoadError(null);

      if (eventsProp) {
        engine.load(eventsProp);
        setDrawings([]);
        if (autoPlay) engine.play();
        return;
      }

      if (!drawingId && !gameId) {
        engine.load([]);
        return;
      }

      setLoading(true);
      try {
        if (gameId) {
          const game = await fetchGameReplay(gameId);
          if (cancelled) return;
          setDrawings(game.drawings);
          const idx = Math.min(
            Math.max(0, initialDrawingIndex),
            Math.max(0, game.drawings.length - 1),
          );
          setDrawingIndex(idx);
          const drawing = game.drawings[idx];
          engine.load(drawing?.events ?? []);
          if (drawing) onDrawingChange?.(drawing, idx);
          if (autoPlay && drawing?.events.length) engine.play();
        } else if (drawingId) {
          const drawing = await fetchDrawingReplay(drawingId);
          if (cancelled) return;
          setDrawings([drawing]);
          setDrawingIndex(0);
          engine.load(drawing.events);
          onDrawingChange?.(drawing, 0);
          if (autoPlay && drawing.events.length) engine.play();
        }
      } catch (err) {
        if (cancelled) return;
        setLoadError(
          err instanceof Error ? err.message : "Failed to load replay",
        );
        engine.load([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventsProp, drawingId, gameId, initialDrawingIndex, autoPlay, engine]);

  const selectDrawing = React.useCallback(
    (index: number) => {
      const drawing = drawings[index];
      if (!drawing) return;
      setDrawingIndex(index);
      engine.load(drawing.events);
      onDrawingChange?.(drawing, index);
      if (autoPlay) engine.play();
    },
    [drawings, engine, onDrawingChange, autoPlay],
  );

  const playing = snap.status === "playing";
  const activeMeta = drawings[drawingIndex]?.meta;
  const hasEvents = snap.eventCount > 0;

  return (
    <div
      className={cn(
        "flex flex-col overflow-hidden rounded-2xl border border-plum/15 bg-[#F7F4EF]",
        className,
      )}
    >
      <div
        className={cn(
          "relative aspect-square w-full overflow-hidden bg-white",
          compact ? "rounded-t-2xl" : "",
        )}
      >
        {loading ? (
          <div className="flex h-full items-center justify-center text-sm text-ink/50">
            Loading replay…
          </div>
        ) : loadError ? (
          <div className="flex h-full items-center justify-center px-4 text-center text-sm text-ink/60">
            {loadError}
          </div>
        ) : !hasEvents ? (
          <div className="flex h-full items-center justify-center text-sm text-ink/50">
            No drawing actions recorded
          </div>
        ) : (
          <ReplaySurface
            engine={engine}
            ariaLabel={
              activeMeta ? `Replay of “${activeMeta.word}”` : "Drawing replay"
            }
          />
        )}
      </div>

      <div
        className={cn(
          "flex flex-col gap-3 border-t border-plum/10 bg-white/80",
          compact ? "px-3 py-2.5" : "px-4 py-3",
        )}
      >
        {activeMeta && !compact ? (
          <div className="flex items-baseline justify-between gap-3">
            <p className="truncate text-sm font-semibold text-ink">
              {activeMeta.word}
              {activeMeta.author_name ? (
                <span className="ml-2 font-normal text-ink/50">
                  by {activeMeta.author_name}
                </span>
              ) : null}
            </p>
            <p className="shrink-0 font-mono text-xs tabular-nums text-ink/45">
              {formatClock(snap.clockMs)} / {formatClock(snap.durationMs)}
            </p>
          </div>
        ) : (
          <p className="font-mono text-xs tabular-nums text-ink/45">
            {formatClock(snap.clockMs)} / {formatClock(snap.durationMs)}
          </p>
        )}

        {drawings.length > 1 ? (
          <div className="flex flex-wrap gap-1.5">
            {drawings.map((d, i) => (
              <button
                key={d.meta.drawing_id}
                type="button"
                onClick={() => selectDrawing(i)}
                className={cn(
                  "rounded-md px-2 py-1 text-xs font-medium transition-colors",
                  i === drawingIndex
                    ? "bg-plum text-white"
                    : "bg-plum/10 text-plum hover:bg-plum/15",
                )}
              >
                R{d.meta.turn_number}
              </button>
            ))}
          </div>
        ) : null}

        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={!hasEvents}
            onClick={() => (playing ? engine.pause() : engine.play())}
            className={cn(
              "inline-flex h-9 min-w-9 items-center justify-center rounded-lg bg-ink text-white transition-opacity",
              "disabled:cursor-not-allowed disabled:opacity-40",
              compact ? "h-8 min-w-8 text-xs" : "text-sm font-semibold",
            )}
            aria-label={playing ? "Pause" : "Play"}
          >
            {playing ? (
              <PauseIcon />
            ) : snap.status === "ended" ? (
              <RestartIcon />
            ) : (
              <PlayIcon />
            )}
          </button>

          <button
            type="button"
            disabled={!hasEvents}
            onClick={() => engine.restart(true)}
            className={cn(
              "inline-flex h-9 min-w-9 items-center justify-center rounded-lg border border-plum/20 bg-white text-ink transition-colors hover:bg-plum/5",
              "disabled:cursor-not-allowed disabled:opacity-40",
              compact ? "h-8 min-w-8" : "",
            )}
            aria-label="Restart"
          >
            <RestartIcon />
          </button>

          <div className="ml-auto flex items-center gap-1">
            {REPLAY_SPEEDS.map((speed) => (
              <SpeedChip
                key={speed}
                speed={speed}
                active={snap.speed === speed}
                onSelect={(s) => engine.setSpeed(s)}
                compact={compact}
              />
            ))}
          </div>
        </div>

        <div
          className="h-1 overflow-hidden rounded-full bg-plum/10"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={Math.max(1, snap.durationMs)}
          aria-valuenow={Math.min(snap.clockMs, snap.durationMs)}
          aria-label="Replay progress"
        >
          <div
            className="h-full rounded-full bg-chartreuse transition-[width] duration-100 ease-linear"
            style={{
              width:
                snap.durationMs > 0
                  ? `${Math.min(100, (snap.clockMs / snap.durationMs) * 100)}%`
                  : "0%",
            }}
          />
        </div>
      </div>

      <span className="sr-only">
        Board {WHITEBOARD_VIEWBOX.width}×{WHITEBOARD_VIEWBOX.height}
      </span>
    </div>
  );
}

function SpeedChip({
  speed,
  active,
  onSelect,
  compact,
}: {
  speed: ReplayPlaybackSpeed;
  active: boolean;
  onSelect: (s: ReplayPlaybackSpeed) => void;
  compact?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(speed)}
      className={cn(
        "rounded-md font-mono font-semibold transition-colors",
        compact ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-1 text-xs",
        active
          ? "bg-chartreuse text-ink"
          : "bg-transparent text-ink/45 hover:bg-plum/5 hover:text-ink",
      )}
      aria-pressed={active}
    >
      {speed}x
    </button>
  );
}

function PlayIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
      <path fill="currentColor" d="M3 1.5v11l9-5.5L3 1.5z" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
      <rect x="3" y="2" width="3" height="10" rx="0.5" fill="currentColor" />
      <rect x="8" y="2" width="3" height="10" rx="0.5" fill="currentColor" />
    </svg>
  );
}

function RestartIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        d="M2.5 7a4.5 4.5 0 1 0 1.2-3M2.5 2.5v3h3"
      />
    </svg>
  );
}
