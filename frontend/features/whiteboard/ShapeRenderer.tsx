"use client";

import * as React from "react";
import type { WhiteboardShape } from "./types";
import {
  arrowHeadPoints,
  arrowHeadSize,
  arrowShaftEnd,
  bezierPathD,
  ROTATE_HANDLE_OFFSET,
  selectionBounds,
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
      const headSize = arrowHeadSize(shape.strokeWidth);
      const shaft = arrowShaftEnd(g.start, g.end, headSize);
      const head = arrowHeadPoints(g.start, g.end, headSize);
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
          <polyline
            points={head}
            fill="none"
            stroke={shape.stroke}
            strokeWidth={shape.strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
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
      <EndpointHandle x={start.x} y={start.y} />
      <EndpointHandle x={end.x} y={end.y} />
      <BezierHandle x={cp1.x} y={cp1.y} />
      <BezierHandle x={cp2.x} y={cp2.y} />
    </g>
  );
}

/** Square resize handles — distinct from bezier control diamonds. */
function ResizeHandle({ x, y }: { x: number; y: number }) {
  const s = 9;
  return (
    <rect
      x={x - s / 2}
      y={y - s / 2}
      width={s}
      height={s}
      rx={1.5}
      fill="#FAFAF8"
      stroke="#703F93"
      strokeWidth={1.5}
      style={{ pointerEvents: "none" }}
      className="wb-handle-pop"
    />
  );
}

/** Circular endpoint handles. */
function EndpointHandle({ x, y }: { x: number; y: number }) {
  return (
    <circle
      cx={x}
      cy={y}
      r={5}
      fill="#FAFAF8"
      stroke="#703F93"
      strokeWidth={1.5}
      style={{ pointerEvents: "none" }}
      className="wb-handle-pop"
    />
  );
}

/** Diamond bezier control handles — lime, distinct from resize squares. */
function BezierHandle({ x, y }: { x: number; y: number }) {
  return (
    <rect
      x={x - 5}
      y={y - 5}
      width={10}
      height={10}
      rx={1}
      fill="#BBE331"
      stroke="#2C2C2C"
      strokeWidth={1.25}
      transform={`rotate(45 ${x} ${y})`}
      style={{ pointerEvents: "none" }}
      className="wb-handle-pop"
    />
  );
}

/** Rotate handle — circle above the bounding box. */
function RotateHandle({ x, y }: { x: number; y: number }) {
  return (
    <>
      <line
        x1={x}
        y1={y + 10}
        x2={x}
        y2={y + 0}
        stroke="#703F93"
        strokeWidth={1.2}
        opacity={0.6}
        style={{ pointerEvents: "none" }}
      />
      <circle
        cx={x}
        cy={y}
        r={6}
        fill="#FAFAF8"
        stroke="#703F93"
        strokeWidth={1.5}
        style={{ pointerEvents: "none" }}
        className="wb-handle-pop"
      />
    </>
  );
}

/** Selection chrome + edit handles for a committed shape. */
export function SelectionOverlay({ shape }: { shape: WhiteboardShape }) {
  const g = shape.geometry;
  const transform = shape.transform || undefined;
  const sel = selectionBounds(shape);
  const bx = sel.x;
  const by = sel.y;
  const bw = sel.width;
  const bh = sel.height;

  const rotateHandleY = by - ROTATE_HANDLE_OFFSET;
  const midX = bx + bw / 2;

  return (
    <g transform={transform} className="wb-select-in">
      {/* Dashed bounding box */}
      <rect
        x={bx}
        y={by}
        width={bw}
        height={bh}
        fill="none"
        stroke="#703F93"
        strokeWidth={1.5}
        strokeDasharray="5 4"
        opacity={0.75}
      />
      {/* Rotate handle */}
      <RotateHandle x={midX} y={rotateHandleY} />
      {/* Corner resize handles */}
      <ResizeHandle x={bx} y={by} />
      <ResizeHandle x={bx + bw} y={by} />
      <ResizeHandle x={bx} y={by + bh} />
      <ResizeHandle x={bx + bw} y={by + bh} />

      {/* Shape-specific inner guides */}
      {g.kind === "bezier" && (
        <>
          <line
            x1={g.start.x}
            y1={g.start.y}
            x2={g.cp1.x}
            y2={g.cp1.y}
            stroke="#703F93"
            strokeWidth={1}
            strokeDasharray="4 3"
            opacity={0.5}
          />
          <line
            x1={g.end.x}
            y1={g.end.y}
            x2={g.cp2.x}
            y2={g.cp2.y}
            stroke="#703F93"
            strokeWidth={1}
            strokeDasharray="4 3"
            opacity={0.5}
          />
          <BezierHandle x={g.cp1.x} y={g.cp1.y} />
          <BezierHandle x={g.cp2.x} y={g.cp2.y} />
          <EndpointHandle x={g.start.x} y={g.start.y} />
          <EndpointHandle x={g.end.x} y={g.end.y} />
        </>
      )}
      {g.kind === "arrow" && (
        <>
          <EndpointHandle x={g.start.x} y={g.start.y} />
          <EndpointHandle x={g.end.x} y={g.end.y} />
        </>
      )}
    </g>
  );
}

export { ShapeNode };
