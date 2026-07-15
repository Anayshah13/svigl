import type { Point, WhiteboardShape } from "./types";

export function createId(prefix = "wb"): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36).slice(-4)}`;
}

export function dist(a: Point, b: Point): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

export function mid(a: Point, b: Point): Point {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

/** Default cubic control points along the chord (1/3, 2/3). */
export function defaultBezierHandles(start: Point, end: Point): { cp1: Point; cp2: Point } {
  return {
    cp1: {
      x: start.x + (end.x - start.x) / 3,
      y: start.y + (end.y - start.y) / 3,
    },
    cp2: {
      x: start.x + ((end.x - start.x) * 2) / 3,
      y: start.y + ((end.y - start.y) * 2) / 3,
    },
  };
}

export function bezierPathD(
  start: Point,
  cp1: Point,
  cp2: Point,
  end: Point,
): string {
  return `M ${start.x} ${start.y} C ${cp1.x} ${cp1.y} ${cp2.x} ${cp2.y} ${end.x} ${end.y}`;
}

export function normalizeRect(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  square: boolean,
): { x: number; y: number; width: number; height: number } {
  let w = x1 - x0;
  let h = y1 - y0;
  if (square) {
    const side = Math.max(Math.abs(w), Math.abs(h));
    w = Math.sign(w || 1) * side;
    h = Math.sign(h || 1) * side;
  }
  const x = w < 0 ? x0 + w : x0;
  const y = h < 0 ? y0 + h : y0;
  return { x, y, width: Math.abs(w), height: Math.abs(h) };
}

export function rectToEllipse(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  circle: boolean,
): { cx: number; cy: number; rx: number; ry: number } {
  const box = normalizeRect(x0, y0, x1, y1, circle);
  return {
    cx: box.x + box.width / 2,
    cy: box.y + box.height / 2,
    rx: box.width / 2,
    ry: box.height / 2,
  };
}

/** Build SVG transform for rotation around a center. */
export function rotateTransform(cx: number, cy: number, degrees: number): string {
  if (!degrees) return "";
  return `rotate(${degrees} ${cx} ${cy})`;
}

/** Skew a rectangle into a parallelogram-like appearance. */
export function skewTransform(skewXDeg: number, originX: number, originY: number): string {
  if (!skewXDeg) return "";
  return `translate(${originX} ${originY}) skewX(${skewXDeg}) translate(${-originX} ${-originY})`;
}

export function composeTransforms(...parts: string[]): string {
  return parts.filter(Boolean).join(" ");
}

/** Arrowhead triangle at `end`, pointing along start→end. */
export function arrowHeadPoints(
  start: Point,
  end: Point,
  size = 12,
): string {
  const angle = Math.atan2(end.y - start.y, end.x - start.x);
  const a1 = angle + Math.PI - Math.PI / 7;
  const a2 = angle + Math.PI + Math.PI / 7;
  const p1 = { x: end.x + Math.cos(a1) * size, y: end.y + Math.sin(a1) * size };
  const p2 = { x: end.x + Math.cos(a2) * size, y: end.y + Math.sin(a2) * size };
  return `${end.x},${end.y} ${p1.x},${p1.y} ${p2.x},${p2.y}`;
}

/** Shorten line so the shaft doesn't cover the arrowhead tip. */
export function arrowShaftEnd(start: Point, end: Point, headSize = 12): Point {
  const len = dist(start, end);
  if (len < 1) return end;
  const t = Math.max(0, (len - headSize * 0.65) / len);
  return {
    x: start.x + (end.x - start.x) * t,
    y: start.y + (end.y - start.y) * t,
  };
}

export function cloneShape(shape: WhiteboardShape): WhiteboardShape {
  return structuredClone(shape);
}

export function cloneShapes(shapes: WhiteboardShape[]): WhiteboardShape[] {
  return shapes.map(cloneShape);
}
