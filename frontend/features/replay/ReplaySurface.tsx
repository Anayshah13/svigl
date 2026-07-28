"use client";

import * as React from "react";
import { WHITEBOARD_VIEWBOX } from "@/features/whiteboard/types";
import { cn } from "@/lib/cn";
import type { ReplayEngine } from "./engine";
import { renderShapesToLayer } from "./renderShapes";

/** Read-only SVG surface driven by ReplayEngine — no React shape state. */
export function ReplaySurface({
  engine,
  className,
  ariaLabel = "Drawing replay",
}: {
  engine: ReplayEngine;
  className?: string;
  ariaLabel?: string;
}) {
  const layerRef = React.useRef<SVGGElement | null>(null);

  React.useEffect(() => {
    const layer = layerRef.current;
    if (!layer) return;
    return engine.onShapes((shapes) => {
      renderShapesToLayer(layer, shapes);
    });
  }, [engine]);

  const { width, height } = WHITEBOARD_VIEWBOX;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className={cn("h-full w-full bg-white", className)}
      role="img"
      aria-label={ariaLabel}
    >
      <rect x={0} y={0} width={width} height={height} fill="#ffffff" />
      <g ref={layerRef} />
    </svg>
  );
}
