import { TARGET_POINTS } from "../config/global";
import type { TimedPoint } from "../types";
import { dist } from "../utils/math";

/**
 * Arc-length resampling — labs.md §1.
 * Re-parameterize the stroke to exactly M equidistant spatial samples
 * so kinematic clustering cannot bias least-squares / covariance fits.
 * Timestamps are linearly interpolated alongside position.
 */
export function resampleByArcLength(
  points: TimedPoint[],
  targetCount: number = TARGET_POINTS,
): TimedPoint[] {
  const n = points.length;
  if (n === 0) return [];
  if (n === 1 || targetCount <= 1) {
    return [{ x: points[0]!.x, y: points[0]!.y, t: points[0]!.t }];
  }

  const cum = new Float64Array(n);
  cum[0] = 0;
  for (let i = 1; i < n; i++) {
    cum[i] = cum[i - 1]! + dist(points[i - 1]!, points[i]!);
  }
  const total = cum[n - 1]!;
  if (total < 1e-12) {
    const out: TimedPoint[] = new Array(targetCount);
    for (let i = 0; i < targetCount; i++) {
      out[i] = { x: points[0]!.x, y: points[0]!.y, t: points[0]!.t };
    }
    return out;
  }

  const out: TimedPoint[] = new Array(targetCount);
  out[0] = { x: points[0]!.x, y: points[0]!.y, t: points[0]!.t };
  out[targetCount - 1] = {
    x: points[n - 1]!.x,
    y: points[n - 1]!.y,
    t: points[n - 1]!.t,
  };

  let seg = 0;
  for (let i = 1; i < targetCount - 1; i++) {
    const target = (total * i) / (targetCount - 1);
    while (seg < n - 2 && cum[seg + 1]! < target) seg++;
    const c0 = cum[seg]!;
    const c1 = cum[seg + 1]!;
    const span = c1 - c0;
    const u = span < 1e-12 ? 0 : (target - c0) / span;
    const a = points[seg]!;
    const b = points[seg + 1]!;
    out[i] = {
      x: a.x + (b.x - a.x) * u,
      y: a.y + (b.y - a.y) * u,
      t: a.t + (b.t - a.t) * u,
    };
  }
  return out;
}
