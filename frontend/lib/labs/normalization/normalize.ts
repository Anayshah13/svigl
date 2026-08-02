import { LAB_CANVAS_CENTER } from "../config/global";
import type { TimedPoint, Vec2 } from "../types";
import { centroidOf, rmsFromOrigin } from "../utils/math";

export type NormalizeResult = {
  points: TimedPoint[];
  centroid: Vec2;
  rms: number;
};

/**
 * Translation + RMS scale invariance — labs.md §1.
 * Bounding-box normalization is rejected (outlier compression).
 * Divide by S_rms so the shape occupies unit-variance space.
 *
 * @deprecated Prefer {@link normalizeFixedOriginRms} for lab games that
 * treat the canvas center as the universal origin.
 */
export function normalizeCentroidRms(points: TimedPoint[]): NormalizeResult {
  const centroid = centroidOf(points);
  return normalizeAboutOrigin(points, centroid);
}

/**
 * Translate relative to a fixed canvas origin (default: viewBox center),
 * then RMS-scale. Position on the board matters — shapes must be drawn
 * around the celestial axis / center guide.
 */
export function normalizeFixedOriginRms(
  points: TimedPoint[],
  origin: Vec2 = LAB_CANVAS_CENTER,
): NormalizeResult {
  return normalizeAboutOrigin(points, origin);
}

function normalizeAboutOrigin(
  points: TimedPoint[],
  origin: Vec2,
): NormalizeResult {
  const centered: TimedPoint[] = new Array(points.length);
  for (let i = 0; i < points.length; i++) {
    const p = points[i]!;
    centered[i] = { x: p.x - origin.x, y: p.y - origin.y, t: p.t };
  }

  let rms = rmsFromOrigin(centered);
  if (rms < 1e-12) rms = 1;

  const scaled: TimedPoint[] = new Array(centered.length);
  for (let i = 0; i < centered.length; i++) {
    const p = centered[i]!;
    scaled[i] = { x: p.x / rms, y: p.y / rms, t: p.t };
  }

  return { points: scaled, centroid: { x: origin.x, y: origin.y }, rms };
}
