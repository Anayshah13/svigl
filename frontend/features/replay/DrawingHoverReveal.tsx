"use client";

/**
 * Gallery card preview: static drawing by default; on hover, briefly redraws
 * recorded actions over 1–5s (not real-time). Timeline loads lazily once.
 */

import * as React from "react";
import { WhiteboardPreview } from "@/components/reactions/WhiteboardPreview";
import { WHITEBOARD_VIEWBOX } from "@/features/whiteboard/types";
import type { WhiteboardExport } from "@/features/whiteboard/types";
import { cn } from "@/lib/cn";
import { fetchDrawingReplay } from "@/services/replay";
import { ReplayEngine } from "./engine";
import { renderShapesToLayer } from "./renderShapes";
import type { ReplayEvent } from "./types";

const timelineCache = new Map<string, ReplayEvent[] | null>();

export function DrawingHoverReveal({
  drawingId,
  document,
  hasReplay,
  className,
}: {
  drawingId: string;
  document: WhiteboardExport | null | undefined;
  hasReplay: boolean;
  className?: string;
}) {
  const layerRef = React.useRef<SVGGElement | null>(null);
  const engineRef = React.useRef<ReplayEngine | null>(null);
  if (engineRef.current == null) engineRef.current = new ReplayEngine();
  const engine = engineRef.current;

  const [animating, setAnimating] = React.useState(false);
  const hoverGen = React.useRef(0);

  React.useEffect(() => {
    const layer = layerRef.current;
    if (!layer) return;
    return engine.onShapes((shapes) => {
      renderShapesToLayer(layer, shapes);
    });
  }, [engine]);

  React.useEffect(() => {
    return () => engine.dispose();
  }, [engine]);

  const stopHover = React.useCallback(() => {
    hoverGen.current += 1;
    engine.stop();
    setAnimating(false);
  }, [engine]);

  const startHover = React.useCallback(async () => {
    if (!hasReplay) return;
    const gen = ++hoverGen.current;
    setAnimating(true);

    let events = timelineCache.get(drawingId);
    if (events === undefined) {
      try {
        const replay = await fetchDrawingReplay(drawingId);
        events = replay.events;
        timelineCache.set(drawingId, events);
      } catch {
        timelineCache.set(drawingId, null);
        if (gen === hoverGen.current) setAnimating(false);
        return;
      }
    }

    if (gen !== hoverGen.current) return;
    if (!events || events.length === 0) {
      setAnimating(false);
      return;
    }

    engine.load(events);
    engine.restart(true);
  }, [drawingId, engine, hasReplay]);

  const { width, height } = WHITEBOARD_VIEWBOX;

  return (
    <div
      className={cn("relative h-full w-full", className)}
      onPointerEnter={() => {
        void startHover();
      }}
      onPointerLeave={stopHover}
    >
      {/* Static final drawing — hidden while hover animation runs */}
      <div
        className={cn(
          "absolute inset-0 transition-opacity duration-150",
          animating ? "pointer-events-none opacity-0" : "opacity-100",
        )}
      >
        <WhiteboardPreview document={document} className="h-full w-full" />
      </div>

      <svg
        viewBox={`0 0 ${width} ${height}`}
        className={cn(
          "absolute inset-0 h-full w-full bg-white transition-opacity duration-150",
          animating ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        aria-hidden={!animating}
      >
        <rect x={0} y={0} width={width} height={height} fill="#ffffff" />
        <g ref={layerRef} />
      </svg>
    </div>
  );
}
