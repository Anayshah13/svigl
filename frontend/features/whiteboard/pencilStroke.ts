/**
 * Freehand pencil stroke helpers.
 *
 * Design goals:
 * - Capture continuous pointer input, but never store thousands of raw points.
 * - Emit a compact, smooth SVG path (`d` string) that integrates with the
 *   rest of the whiteboard's SVG-first shape model.
 * - Live-preview rendering uses the same builder that the committed stroke
 *   does, so what the user sees mid-drag matches the persisted shape.
 *
 * The path uses quadratic beziers through midpoints of consecutive samples
 * ("moving average" smoothing) — a well-known technique that produces
 * visually smooth curves with low overhead and no post-processing pass.
 */

import type { Point } from "./types";

/** Minimum spacing (board units) between raw pencil samples we keep. */
export const PENCIL_MIN_SAMPLE_DISTANCE = 1.5;

/** Minimum total stroke length (board units) required to commit. */
export const PENCIL_MIN_STROKE_LENGTH = 3;

/**
 * Base RDP tolerance (board units). Scaled by stroke width so heavier
 * strokes tolerate more simplification without visual degradation.
 */
export const PENCIL_BASE_SIMPLIFY_TOLERANCE = 0.6;

/** Round a coordinate to 2 decimal places to keep serialized paths compact. */
function fmt(n: number): string {
  const r = Math.round(n * 100) / 100;
  return Number.isInteger(r) ? String(r) : String(r);
}

function distSq(a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return dx * dx + dy * dy;
}

/** Perpendicular distance from `p` to line segment `a`→`b`. */
function perpendicularDistance(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len2 = dx * dx + dy * dy;
  if (len2 < 1e-9) return Math.hypot(p.x - a.x, p.y - a.y);
  const t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2;
  const cx = a.x + t * dx;
  const cy = a.y + t * dy;
  return Math.hypot(p.x - cx, p.y - cy);
}

/**
 * Ramer-Douglas-Peucker polyline simplification.
 * Preserves endpoints and any interior points whose perpendicular
 * distance to the current line segment exceeds `tolerance`.
 */
export function simplifyPoints(points: Point[], tolerance: number): Point[] {
  if (points.length <= 2 || tolerance <= 0) return points.slice();
  const keep = new Uint8Array(points.length);
  keep[0] = 1;
  keep[points.length - 1] = 1;

  const stack: Array<[number, number]> = [[0, points.length - 1]];
  const tol2 = tolerance;
  while (stack.length) {
    const [lo, hi] = stack.pop()!;
    let maxIdx = -1;
    let maxDist = 0;
    for (let i = lo + 1; i < hi; i++) {
      const d = perpendicularDistance(points[i]!, points[lo]!, points[hi]!);
      if (d > maxDist) {
        maxDist = d;
        maxIdx = i;
      }
    }
    if (maxIdx !== -1 && maxDist > tol2) {
      keep[maxIdx] = 1;
      stack.push([lo, maxIdx]);
      stack.push([maxIdx, hi]);
    }
  }

  const out: Point[] = [];
  for (let i = 0; i < points.length; i++) if (keep[i]) out.push(points[i]!);
  return out;
}

/**
 * Append a raw pointer sample onto a running buffer when it is far enough
 * from the last accepted sample. Returns whether the buffer changed.
 * Kept inline (no closure state) so callers can drive it from refs.
 */
export function pushPencilSample(
  buffer: Point[],
  next: Point,
  minDistance = PENCIL_MIN_SAMPLE_DISTANCE,
): boolean {
  if (buffer.length === 0) {
    buffer.push(next);
    return true;
  }
  const last = buffer[buffer.length - 1]!;
  if (distSq(last, next) < minDistance * minDistance) return false;
  buffer.push(next);
  return true;
}

/**
 * Build a smoothed SVG `d` string from an ordered point list.
 *
 * Uses the "quadratic Bezier through midpoints" technique: each interior
 * sample becomes the quadratic control point, with the on-curve endpoint
 * placed at the midpoint of the next sample. This is a widely-used method
 * for smoothing freehand input while keeping the payload compact.
 */
export function buildPencilPathD(points: Point[]): string {
  if (points.length === 0) return "";
  const first = points[0]!;
  if (points.length === 1) {
    // Rendered with round line cap → single tap draws a filled dot.
    return `M ${fmt(first.x)} ${fmt(first.y)} L ${fmt(first.x)} ${fmt(first.y)}`;
  }
  if (points.length === 2) {
    const p1 = points[1]!;
    return `M ${fmt(first.x)} ${fmt(first.y)} L ${fmt(p1.x)} ${fmt(p1.y)}`;
  }
  const parts: string[] = [`M ${fmt(first.x)} ${fmt(first.y)}`];
  for (let i = 1; i < points.length - 1; i++) {
    const cur = points[i]!;
    const next = points[i + 1]!;
    const mx = (cur.x + next.x) / 2;
    const my = (cur.y + next.y) / 2;
    parts.push(`Q ${fmt(cur.x)} ${fmt(cur.y)} ${fmt(mx)} ${fmt(my)}`);
  }
  const last = points[points.length - 1]!;
  parts.push(`L ${fmt(last.x)} ${fmt(last.y)}`);
  return parts.join(" ");
}

/**
 * Simplify raw samples then build a compact SVG `d` string.
 * `strokeWidth` scales the simplification tolerance so heavier strokes
 * don't retain sub-pixel wobble.
 */
export function finalizePencilPath(points: Point[], strokeWidth: number): string {
  const tolerance = Math.max(
    PENCIL_BASE_SIMPLIFY_TOLERANCE,
    strokeWidth * 0.35 + PENCIL_BASE_SIMPLIFY_TOLERANCE,
  );
  const simplified = simplifyPoints(points, tolerance);
  return buildPencilPathD(simplified);
}

/** Approximate polyline length for the sample buffer. */
export function pencilPointsLength(points: Point[]): number {
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    total += Math.hypot(points[i]!.x - points[i - 1]!.x, points[i]!.y - points[i - 1]!.y);
  }
  return total;
}

/**
 * Extract on-curve anchor points from a pencil path `d` string produced by
 * `buildPencilPathD`. Skips off-curve control points so the returned polyline
 * closely tracks the visible stroke — good enough for AABB bounds and
 * proximity hit-testing without spinning up a full path parser.
 */
export function pencilPathAnchors(d: string): Point[] {
  if (!d) return [];
  const tokens = d.match(/[MLQCTS]|-?\d*\.?\d+(?:[eE][+-]?\d+)?/g);
  if (!tokens) return [];
  const points: Point[] = [];
  let cmd = "";
  let i = 0;
  while (i < tokens.length) {
    const t = tokens[i]!;
    if (/^[a-zA-Z]$/.test(t)) {
      cmd = t;
      i++;
      continue;
    }
    if (cmd === "M" || cmd === "L" || cmd === "T") {
      const x = Number(tokens[i]);
      const y = Number(tokens[i + 1]);
      if (Number.isFinite(x) && Number.isFinite(y)) points.push({ x, y });
      i += 2;
    } else if (cmd === "Q" || cmd === "S") {
      const x = Number(tokens[i + 2]);
      const y = Number(tokens[i + 3]);
      if (Number.isFinite(x) && Number.isFinite(y)) points.push({ x, y });
      i += 4;
    } else if (cmd === "C") {
      const x = Number(tokens[i + 4]);
      const y = Number(tokens[i + 5]);
      if (Number.isFinite(x) && Number.isFinite(y)) points.push({ x, y });
      i += 6;
    } else {
      i++;
    }
  }
  return points;
}

/**
 * Rewrite every coordinate in a pencil path `d` string through `fn`.
 * Preserves command letters + on-curve/off-curve pair order so the output
 * renders identically after affine transforms are applied by the caller.
 */
export function mapPencilPathPoints(d: string, fn: (p: Point) => Point): string {
  // Never return undefined — SVG `<path d>` would become the literal
  // string "undefined" and throw in the browser renderer.
  if (!d) return "";
  const tokens = d.match(/[MLQCTSHVZ]|-?\d*\.?\d+(?:[eE][+-]?\d+)?/gi);
  if (!tokens) return d;
  const out: string[] = [];
  let cmd = "";
  let i = 0;
  while (i < tokens.length) {
    const t = tokens[i]!;
    if (/^[a-zA-Z]$/.test(t)) {
      cmd = t;
      out.push(t);
      i++;
      continue;
    }
    const readPoint = (offset: number): Point =>
      fn({ x: Number(tokens[i + offset]), y: Number(tokens[i + offset + 1]) });
    if (cmd === "M" || cmd === "L" || cmd === "T") {
      const p = readPoint(0);
      out.push(fmt(p.x), fmt(p.y));
      i += 2;
    } else if (cmd === "Q" || cmd === "S") {
      const c = readPoint(0);
      const p = readPoint(2);
      out.push(fmt(c.x), fmt(c.y), fmt(p.x), fmt(p.y));
      i += 4;
    } else if (cmd === "C") {
      const c1 = readPoint(0);
      const c2 = readPoint(2);
      const p = readPoint(4);
      out.push(fmt(c1.x), fmt(c1.y), fmt(c2.x), fmt(c2.y), fmt(p.x), fmt(p.y));
      i += 6;
    } else {
      // Unknown or parameterless (Z / H / V) — pass through as-is.
      out.push(t);
      i++;
    }
  }
  return out.join(" ");
}
