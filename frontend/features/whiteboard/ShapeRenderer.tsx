"use client";

import * as React from "react";
import type { WhiteboardShape } from "./types";
import {
  arrowHeadPoints,
  arrowShaftEnd,
  bezierPathD,
} from "./geometry";

function ShapeNode({ shape }: { shape: WhiteboardShape }) {
  const common = {
    stroke: shape.stroke,
    strokeWidth: shape.strokeWidth,
    fill: shape.fill,
    transform: shape.transform || undefined,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  switch (shape.geometry.kind) {
    case "bezier": {
      const g = shape.geometry;
      return (
        <path
          d={bezierPathD(g.start, g.cp1, g.cp2, g.end)}
          {...common}
          fill="none"
        />
      );
    }
    case "rectangle": {
      const g = shape.geometry;
      return (
        <rect
          x={g.x}
          y={g.y}
          width={g.width}
          height={g.height}
          {...common}
        />
      );
    }
    case "ellipse": {
      const g = shape.geometry;
      return (
        <ellipse cx={g.cx} cy={g.cy} rx={g.rx} ry={g.ry} {...common} />
      );
    }
    case "arrow": {
      const g = shape.geometry;
      const shaft = arrowShaftEnd(g.start, g.end, Math.max(10, shape.strokeWidth * 2.5));
      const head = arrowHeadPoints(
        g.start,
        g.end,
        Math.max(10, shape.strokeWidth * 2.5),
      );
      return (
        <g transform={shape.transform || undefined}>
          <line
            x1={g.start.x}
            y1={g.start.y}
            x2={shaft.x}
            y2={shaft.y}
            stroke={shape.stroke}
            strokeWidth={shape.strokeWidth}
            strokeLinecap="round"
          />
          <polygon points={head} fill={shape.stroke} stroke="none" />
        </g>
      );
    }
    case "fill":
      return (
        <path
          d={shape.geometry.d}
          fill={shape.fill === "none" ? shape.stroke : shape.fill}
          stroke="none"
          transform={shape.transform || undefined}
        />
      );
    default:
      return null;
  }
}

export function ShapeList({
  shapes,
  selectedId,
}: {
  shapes: WhiteboardShape[];
  selectedId?: string | null;
}) {
  return (
    <>
      {shapes.map((shape) => (
        <g key={shape.id} opacity={selectedId && selectedId !== shape.id ? 0.92 : 1}>
          <ShapeNode shape={shape} />
        </g>
      ))}
    </>
  );
}

export interface BezierDraftOverlayProps {
  start: { x: number; y: number };
  end: { x: number; y: number };
  cp1: { x: number; y: number };
  cp2: { x: number; y: number };
  stroke: string;
  strokeWidth: number;
}

/** Live cubic + manipulable handles while creating. */
export function BezierDraftOverlay({
  start,
  end,
  cp1,
  cp2,
  stroke,
  strokeWidth,
}: BezierDraftOverlayProps) {
  return (
    <g>
      <path
        d={bezierPathD(start, cp1, cp2, end)}
        stroke={stroke}
        strokeWidth={strokeWidth}
        fill="none"
        strokeLinecap="round"
      />
      <line
        x1={start.x}
        y1={start.y}
        x2={cp1.x}
        y2={cp1.y}
        stroke="#703F93"
        strokeWidth={1}
        strokeDasharray="4 3"
        opacity={0.7}
      />
      <line
        x1={end.x}
        y1={end.y}
        x2={cp2.x}
        y2={cp2.y}
        stroke="#703F93"
        strokeWidth={1}
        strokeDasharray="4 3"
        opacity={0.7}
      />
      <circle cx={start.x} cy={start.y} r={4} fill="#FAFAF8" stroke="#703F93" strokeWidth={1.5} />
      <circle cx={end.x} cy={end.y} r={4} fill="#FAFAF8" stroke="#703F93" strokeWidth={1.5} />
      <circle cx={cp1.x} cy={cp1.y} r={5} fill="#BBE331" stroke="#2C2C2C" strokeWidth={1} />
      <circle cx={cp2.x} cy={cp2.y} r={5} fill="#BBE331" stroke="#2C2C2C" strokeWidth={1} />
    </g>
  );
}

function Handle({
  x,
  y,
  r = 6,
  fill = "#BBE331",
}: {
  x: number;
  y: number;
  r?: number;
  fill?: string;
}) {
  return (
    <circle
      cx={x}
      cy={y}
      r={r}
      fill={fill}
      stroke="#2C2C2C"
      strokeWidth={1.25}
      style={{ pointerEvents: "none" }}
    />
  );
}

/** Selection chrome + edit handles for a committed shape. */
export function SelectionOverlay({ shape }: { shape: WhiteboardShape }) {
  const g = shape.geometry;
  const transform = shape.transform || undefined;

  if (g.kind === "bezier") {
    return (
      <g>
        <path
          d={bezierPathD(g.start, g.cp1, g.cp2, g.end)}
          stroke="#703F93"
          strokeWidth={shape.strokeWidth + 4}
          fill="none"
          opacity={0.25}
          strokeLinecap="round"
        />
        <line
          x1={g.start.x}
          y1={g.start.y}
          x2={g.cp1.x}
          y2={g.cp1.y}
          stroke="#703F93"
          strokeWidth={1}
          strokeDasharray="4 3"
          opacity={0.7}
        />
        <line
          x1={g.end.x}
          y1={g.end.y}
          x2={g.cp2.x}
          y2={g.cp2.y}
          stroke="#703F93"
          strokeWidth={1}
          strokeDasharray="4 3"
          opacity={0.7}
        />
        <Handle x={g.start.x} y={g.start.y} r={5} fill="#FAFAF8" />
        <Handle x={g.end.x} y={g.end.y} r={5} fill="#FAFAF8" />
        <Handle x={g.cp1.x} y={g.cp1.y} />
        <Handle x={g.cp2.x} y={g.cp2.y} />
      </g>
    );
  }

  if (g.kind === "rectangle") {
    return (
      <g transform={transform}>
        <rect
          x={g.x - 3}
          y={g.y - 3}
          width={g.width + 6}
          height={g.height + 6}
          fill="none"
          stroke="#703F93"
          strokeWidth={1.5}
          strokeDasharray="5 4"
          opacity={0.85}
        />
        <Handle x={g.x} y={g.y} />
        <Handle x={g.x + g.width} y={g.y} />
        <Handle x={g.x} y={g.y + g.height} />
        <Handle x={g.x + g.width} y={g.y + g.height} />
      </g>
    );
  }

  if (g.kind === "ellipse") {
    return (
      <g transform={transform}>
        <ellipse
          cx={g.cx}
          cy={g.cy}
          rx={g.rx + 3}
          ry={g.ry + 3}
          fill="none"
          stroke="#703F93"
          strokeWidth={1.5}
          strokeDasharray="5 4"
          opacity={0.85}
        />
        <Handle x={g.cx - g.rx} y={g.cy - g.ry} />
        <Handle x={g.cx + g.rx} y={g.cy - g.ry} />
        <Handle x={g.cx - g.rx} y={g.cy + g.ry} />
        <Handle x={g.cx + g.rx} y={g.cy + g.ry} />
      </g>
    );
  }

  if (g.kind === "arrow") {
    return (
      <g transform={transform}>
        <line
          x1={g.start.x}
          y1={g.start.y}
          x2={g.end.x}
          y2={g.end.y}
          stroke="#703F93"
          strokeWidth={shape.strokeWidth + 4}
          opacity={0.25}
          strokeLinecap="round"
        />
        <Handle x={g.start.x} y={g.start.y} r={5} fill="#FAFAF8" />
        <Handle x={g.end.x} y={g.end.y} r={5} fill="#FAFAF8" />
      </g>
    );
  }

  // fill — outline approx bounding box from path is expensive; show a subtle highlight ring via filter-like stroke
  return (
    <g transform={transform}>
      <path
        d={g.d}
        fill="none"
        stroke="#703F93"
        strokeWidth={3}
        opacity={0.45}
        strokeDasharray="6 4"
      />
    </g>
  );
}

export { ShapeNode };
