import type { Vec2 } from "../types";
import { scaleToUnitRms } from "./procrustes";
import { resampleByArcLength } from "../normalization/resample";
import type { TimedPoint } from "../types";

/**
 * Canonical Lemniscate of Bernoulli — labs.md §10.
 * x = √2 cos(t) / (1 + sin²(t))
 * y = √2 cos(t) sin(t) / (1 + sin²(t))
 *
 * Sampled densely in t, then arc-length resampled to `count` so Procrustes
 * compares equal-speed parameterizations (critical for low residual).
 */
export function generateLemniscate(count: number): Vec2[] {
  const dense = 4 * Math.max(count, 64);
  const raw: TimedPoint[] = new Array(dense);
  const sqrt2 = Math.SQRT2;
  for (let i = 0; i < dense; i++) {
    // Full two-lobe period: t ∈ [0, 2π).
    const t = (2 * Math.PI * i) / dense;
    const s = Math.sin(t);
    const c = Math.cos(t);
    const denom = 1 + s * s;
    raw[i] = {
      x: (sqrt2 * c) / denom,
      y: (sqrt2 * c * s) / denom,
      t: i,
    };
  }
  const resampled = resampleByArcLength(raw, count);
  return scaleToUnitRms(resampled);
}

/**
 * Best cyclic shift of `user` against `reference` by coarse search on
 * mean squared error (phase alignment before Procrustes rotation).
 */
export function bestCyclicShift(user: Vec2[], reference: Vec2[]): Vec2[] {
  const n = Math.min(user.length, reference.length);
  if (n === 0) return [];

  let bestShift = 0;
  let bestErr = Infinity;
  // Coarse then refine — N=1000, step 8 keeps this well under 1ms.
  const coarse = 8;
  for (let shift = 0; shift < n; shift += coarse) {
    const err = shiftError(user, reference, shift, n);
    if (err < bestErr) {
      bestErr = err;
      bestShift = shift;
    }
  }
  const lo = Math.max(0, bestShift - coarse);
  const hi = Math.min(n - 1, bestShift + coarse);
  for (let shift = lo; shift <= hi; shift++) {
    const err = shiftError(user, reference, shift, n);
    if (err < bestErr) {
      bestErr = err;
      bestShift = shift;
    }
  }

  const out: Vec2[] = new Array(n);
  for (let i = 0; i < n; i++) {
    out[i] = user[(i + bestShift) % n]!;
  }
  return out;
}

function shiftError(
  user: Vec2[],
  reference: Vec2[],
  shift: number,
  n: number,
): number {
  let s = 0;
  for (let i = 0; i < n; i++) {
    const u = user[(i + shift) % n]!;
    const r = reference[i]!;
    const dx = u.x - r.x;
    const dy = u.y - r.y;
    s += dx * dx + dy * dy;
  }
  return s;
}
