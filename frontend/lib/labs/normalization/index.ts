import { TARGET_POINTS } from "../config/global";
import type { NormalizedStroke, TimedPoint } from "../types";
import { dist, polylineLength } from "../utils/math";
import { normalizeCentroidRms } from "./normalize";
import { resampleByArcLength } from "./resample";
import { applyTopologyFixes } from "./topology";

/**
 * Full preprocessing pipeline before shape fitting — labs.md §9 steps 3–5.
 */
export function preprocessStroke(
  raw: TimedPoint[],
  options?: { targetPoints?: number; enforceCcw?: boolean },
): NormalizedStroke {
  const targetPoints = options?.targetPoints ?? TARGET_POINTS;
  const rawArcLength = polylineLength(raw);
  const resampled = resampleByArcLength(raw, targetPoints);
  const { points: normalized, centroid, rms } = normalizeCentroidRms(resampled);
  const { points, closureRatio } = applyTopologyFixes(normalized, {
    enforceCcw: options?.enforceCcw,
  });

  const closureGap = dist(points[0]!, points[points.length - 1]!);

  return {
    points,
    rawArcLength,
    closureRatio,
    closureGap,
    centroid,
    rms,
  };
}
