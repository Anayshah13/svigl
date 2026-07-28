import {
  CLOSURE_BLEND_FRACTION,
  CLOSURE_THRESHOLD,
} from "../config/global";
import type { TimedPoint } from "../types";
import { dist, polylineLength, shoelaceArea } from "../utils/math";

/**
 * Orientation + closed-loop correction — labs.md §1.
 *
 * 1. If gap(p1, pM) / L ≤ CLOSURE_THRESHOLD, blend the first/last
 *    CLOSURE_BLEND_FRACTION of samples toward each other so curvature
 *    analysis does not see a topological tear.
 * 2. Enforce counter-clockwise via Shoelace (needed for Procrustes /
 *    temporal correspondence on the infinity loop).
 */
export function applyTopologyFixes(
  points: TimedPoint[],
  options?: { enforceCcw?: boolean },
): { points: TimedPoint[]; closureRatio: number; wasClosed: boolean } {
  const n = points.length;
  if (n < 3) {
    return { points: points.slice(), closureRatio: 1, wasClosed: false };
  }

  const L = polylineLength(points);
  const gap = dist(points[0]!, points[n - 1]!);
  const closureRatio = L > 1e-12 ? gap / L : 1;
  let working = points.map((p) => ({ ...p }));

  const wasClosed = closureRatio <= CLOSURE_THRESHOLD;
  if (wasClosed && gap > 1e-9) {
    working = blendClosure(working, CLOSURE_BLEND_FRACTION);
  }

  const enforceCcw = options?.enforceCcw !== false;
  if (enforceCcw && shoelaceArea(working) < 0) {
    working.reverse();
  }

  return { points: working, closureRatio, wasClosed };
}

/**
 * Linear blend of the first/last `fraction` of the polyline toward a
 * shared midpoint, eliminating the residual gap without a curvature spike.
 */
function blendClosure(points: TimedPoint[], fraction: number): TimedPoint[] {
  const n = points.length;
  const count = Math.max(1, Math.floor(n * fraction));
  const out = points.map((p) => ({ ...p }));
  const start = out[0]!;
  const end = out[n - 1]!;
  const midX = (start.x + end.x) / 2;
  const midY = (start.y + end.y) / 2;

  for (let i = 0; i < count; i++) {
    const w = (count - i) / (count + 1); // 1 near endpoint → 0 inward
    const a = out[i]!;
    a.x = a.x * (1 - w) + midX * w;
    a.y = a.y * (1 - w) + midY * w;

    const b = out[n - 1 - i]!;
    b.x = b.x * (1 - w) + midX * w;
    b.y = b.y * (1 - w) + midY * w;
  }

  // Snap exact endpoints together for closed topology.
  out[n - 1] = { x: out[0]!.x, y: out[0]!.y, t: out[n - 1]!.t };
  return out;
}
