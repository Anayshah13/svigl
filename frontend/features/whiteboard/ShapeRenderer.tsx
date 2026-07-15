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

export function ShapeList({ shapes }: { shapes: WhiteboardShape[] }) {
  return (
    <>
      {shapes.map((shape) => (
        <ShapeNode key={shape.id} shape={shape} />
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

export { ShapeNode };
