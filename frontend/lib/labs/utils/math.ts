import type { TimedPoint, Vec2 } from "../types";

export function dist(a: Vec2, b: Vec2): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

export function distSq(a: Vec2, b: Vec2): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return dx * dx + dy * dy;
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

export function mean(values: ArrayLike<number>): number {
  const n = values.length;
  if (n === 0) return 0;
  let s = 0;
  for (let i = 0; i < n; i++) s += values[i]!;
  return s / n;
}

export function variance(values: ArrayLike<number>): number {
  const n = values.length;
  if (n < 2) return 0;
  const m = mean(values);
  let s = 0;
  for (let i = 0; i < n; i++) {
    const d = values[i]! - m;
    s += d * d;
  }
  return s / n;
}

export function rms(values: ArrayLike<number>): number {
  const n = values.length;
  if (n === 0) return 0;
  let s = 0;
  for (let i = 0; i < n; i++) {
    const v = values[i]!;
    s += v * v;
  }
  return Math.sqrt(s / n);
}

/** Perpendicular distance from point p to infinite line through a→b. */
export function perpDistToLine(p: Vec2, a: Vec2, b: Vec2): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy);
  if (len < 1e-12) return dist(p, a);
  return Math.abs(dy * p.x - dx * p.y + b.x * a.y - b.y * a.x) / len;
}

/** Signed area via Shoelace; positive ⇒ counter-clockwise. */
export function shoelaceArea(points: ArrayLike<Vec2>): number {
  const n = points.length;
  if (n < 3) return 0;
  let a = 0;
  for (let i = 0; i < n; i++) {
    const p = points[i]!;
    const q = points[(i + 1) % n]!;
    a += p.x * q.y - q.x * p.y;
  }
  return a / 2;
}

export function polylineLength(points: ArrayLike<Vec2>): number {
  let L = 0;
  for (let i = 1; i < points.length; i++) {
    L += dist(points[i - 1]!, points[i]!);
  }
  return L;
}

export function centroidOf(points: ArrayLike<Vec2>): Vec2 {
  const n = points.length;
  if (n === 0) return { x: 0, y: 0 };
  let sx = 0;
  let sy = 0;
  for (let i = 0; i < n; i++) {
    sx += points[i]!.x;
    sy += points[i]!.y;
  }
  return { x: sx / n, y: sy / n };
}

/** RMS distance from origin (assumes already centered). */
export function rmsFromOrigin(points: ArrayLike<Vec2>): number {
  const n = points.length;
  if (n === 0) return 0;
  let s = 0;
  for (let i = 0; i < n; i++) {
    const p = points[i]!;
    s += p.x * p.x + p.y * p.y;
  }
  return Math.sqrt(s / n);
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function asSpatial(points: TimedPoint[]): Vec2[] {
  return points.map((p) => ({ x: p.x, y: p.y }));
}

/**
 * Winding number of a closed polyline around the origin.
 * |w| ≈ 1 means the stroke encircles (0,0) once.
 */
export function windingAroundOrigin(points: ArrayLike<Vec2>): number {
  const n = points.length;
  if (n < 3) return 0;
  let accum = 0;
  for (let i = 0; i < n; i++) {
    const a = points[i]!;
    const b = points[(i + 1) % n]!;
    const a1 = Math.atan2(a.y, a.x);
    const a2 = Math.atan2(b.y, b.x);
    let d = a2 - a1;
    if (d > Math.PI) d -= 2 * Math.PI;
    if (d < -Math.PI) d += 2 * Math.PI;
    accum += d;
  }
  return accum / (2 * Math.PI);
}

/** Ray-cast point-in-polygon test for the origin (0,0). */
export function originInsidePolygon(points: ArrayLike<Vec2>): boolean {
  const n = points.length;
  if (n < 3) return false;
  let inside = false;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const pi = points[i]!;
    const pj = points[j]!;
    const intersects =
      pi.y > 0 !== pj.y > 0 &&
      0 < ((pj.x - pi.x) * -pi.y) / (pj.y - pi.y) + pi.x;
    if (intersects) inside = !inside;
  }
  return inside;
}
