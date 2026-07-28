import type { Vec2 } from "../types";

/**
 * Circle RMSE = std-dev of residuals |‖p − c‖ − R| — labs.md §3.
 */
export function circleRmse(
  points: ArrayLike<Vec2>,
  center: Vec2,
  radius: number,
): number {
  const n = points.length;
  if (n === 0) return Infinity;
  const residuals = new Float64Array(n);
  let mean = 0;
  for (let i = 0; i < n; i++) {
    const p = points[i]!;
    const r = Math.hypot(p.x - center.x, p.y - center.y);
    residuals[i] = r - radius;
    mean += residuals[i]!;
  }
  mean /= n;
  let varSum = 0;
  for (let i = 0; i < n; i++) {
    const d = residuals[i]! - mean;
    varSum += d * d;
  }
  return Math.sqrt(varSum / n);
}

/** Max |‖p − c‖ − R| — radial Hausdorff to the fitted circle. */
export function circleMaxDeviation(
  points: ArrayLike<Vec2>,
  center: Vec2,
  radius: number,
): number {
  let max = 0;
  for (let i = 0; i < points.length; i++) {
    const p = points[i]!;
    const d = Math.abs(Math.hypot(p.x - center.x, p.y - center.y) - radius);
    if (d > max) max = d;
  }
  return max;
}

/**
 * Symmetric Hausdorff between two polylines (sampled).
 * d_H(X,Y) = max( sup_x inf_y d(x,y), sup_y inf_x d(x,y) ).
 */
export function hausdorffDistance(
  a: ArrayLike<Vec2>,
  b: ArrayLike<Vec2>,
): number {
  return Math.max(directedHausdorff(a, b), directedHausdorff(b, a));
}

function directedHausdorff(from: ArrayLike<Vec2>, to: ArrayLike<Vec2>): number {
  let maxMin = 0;
  for (let i = 0; i < from.length; i++) {
    const p = from[i]!;
    let best = Infinity;
    for (let j = 0; j < to.length; j++) {
      const q = to[j]!;
      const d = Math.hypot(p.x - q.x, p.y - q.y);
      if (d < best) best = d;
    }
    if (best > maxMin) maxMin = best;
  }
  return maxMin;
}

/** Sample an ideal circle for bidirectional Hausdorff. */
export function sampleCircle(center: Vec2, radius: number, count: number): Vec2[] {
  const out: Vec2[] = new Array(count);
  for (let i = 0; i < count; i++) {
    const t = (2 * Math.PI * i) / count;
    out[i] = {
      x: center.x + radius * Math.cos(t),
      y: center.y + radius * Math.sin(t),
    };
  }
  return out;
}
