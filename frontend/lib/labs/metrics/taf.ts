import { TAF_SMOOTH_SIGMA } from "../config/global";
import type { TimedPoint, Vec2 } from "../types";
import { mean, variance } from "../utils/math";

/**
 * Turning Angle Function — labs.md §3.
 * Θ(s) = unwrap(atan2(dy, dx)); curvature ≈ dΘ/ds.
 * Smoothness = variance of the (Gaussian-smoothed) TAF derivative.
 */
export function turningAngles(points: ArrayLike<Vec2>): Float64Array {
  const n = points.length;
  const theta = new Float64Array(Math.max(0, n - 1));
  for (let i = 0; i < n - 1; i++) {
    const a = points[i]!;
    const b = points[i + 1]!;
    theta[i] = Math.atan2(b.y - a.y, b.x - a.x);
  }
  return unwrapAngles(theta);
}

export function unwrapAngles(angles: Float64Array): Float64Array {
  const out = new Float64Array(angles.length);
  if (angles.length === 0) return out;
  out[0] = angles[0]!;
  for (let i = 1; i < angles.length; i++) {
    let d = angles[i]! - angles[i - 1]!;
    while (d > Math.PI) d -= 2 * Math.PI;
    while (d < -Math.PI) d += 2 * Math.PI;
    out[i] = out[i - 1]! + d;
  }
  return out;
}

/** Total absolute turning ∫|dθ| — used for multi-loop detection. */
export function totalAbsoluteTurning(points: ArrayLike<Vec2>): number {
  const theta = turningAngles(points);
  let sum = 0;
  for (let i = 1; i < theta.length; i++) {
    sum += Math.abs(theta[i]! - theta[i - 1]!);
  }
  return sum;
}

/**
 * Variance of dΘ/ds after light Gaussian smoothing (negates pixel noise).
 */
export function tafDerivativeVariance(
  points: ArrayLike<Vec2>,
  sigma: number = TAF_SMOOTH_SIGMA,
): number {
  const theta = turningAngles(points);
  if (theta.length < 3) return 0;
  const smoothed = gaussianSmooth(theta, sigma);
  const deriv = new Float64Array(smoothed.length - 1);
  for (let i = 0; i < deriv.length; i++) {
    deriv[i] = smoothed[i + 1]! - smoothed[i]!;
  }
  return variance(deriv);
}

function gaussianSmooth(data: Float64Array, sigma: number): Float64Array {
  if (sigma <= 0 || data.length === 0) return data.slice();
  const radius = Math.max(1, Math.ceil(sigma * 3));
  const kernel = new Float64Array(radius * 2 + 1);
  let ksum = 0;
  for (let i = -radius; i <= radius; i++) {
    const v = Math.exp(-(i * i) / (2 * sigma * sigma));
    kernel[i + radius] = v;
    ksum += v;
  }
  for (let i = 0; i < kernel.length; i++) kernel[i]! /= ksum;

  const out = new Float64Array(data.length);
  for (let i = 0; i < data.length; i++) {
    let s = 0;
    for (let k = -radius; k <= radius; k++) {
      const j = Math.min(data.length - 1, Math.max(0, i + k));
      s += data[j]! * kernel[k + radius]!;
    }
    out[i] = s;
  }
  return out;
}

/**
 * Two-Thirds Power Law confidence — labs.md §3.
 * V = K · R^(1/3) ⇒ K = V / R^(1/3). Variance of K measures fluency.
 */
export function kinematicConfidenceError(points: TimedPoint[]): number {
  const n = points.length;
  if (n < 5) return 1;

  const Ks: number[] = [];
  for (let i = 1; i < n - 1; i++) {
    const prev = points[i - 1]!;
    const cur = points[i]!;
    const next = points[i + 1]!;
    const dt = Math.max(1e-3, (next.t - prev.t) / 2);
    const ds = Math.hypot(next.x - prev.x, next.y - prev.y) / 2;
    const V = ds / dt;

    // Discrete curvature radius via Menger curvature of (prev,cur,next).
    const a = Math.hypot(cur.x - prev.x, cur.y - prev.y);
    const b = Math.hypot(next.x - cur.x, next.y - cur.y);
    const c = Math.hypot(next.x - prev.x, next.y - prev.y);
    const area2 = Math.abs(
      (cur.x - prev.x) * (next.y - prev.y) - (cur.y - prev.y) * (next.x - prev.x),
    );
    if (area2 < 1e-12 || a < 1e-9 || b < 1e-9 || c < 1e-9) continue;
    const R = (a * b * c) / (2 * area2);
    if (!(R > 0) || !Number.isFinite(R)) continue;

    const K = V / Math.pow(R, 1 / 3);
    if (Number.isFinite(K) && K > 0) Ks.push(K);
  }

  if (Ks.length < 4) return 0;

  // Coefficient of variation of K — scale-free fluency measure.
  const m = mean(Ks);
  if (m < 1e-12) return 1;
  return Math.sqrt(variance(Ks)) / m;
}

/** Euclidean speed samples v = ds/dt for bot detection. */
export function velocitySamples(points: TimedPoint[]): number[] {
  const out: number[] = [];
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1]!;
    const b = points[i]!;
    const dt = b.t - a.t;
    if (dt <= 1e-6) continue;
    out.push(Math.hypot(b.x - a.x, b.y - a.y) / dt);
  }
  return out;
}
