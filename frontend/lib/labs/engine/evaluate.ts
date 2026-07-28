import { TARGET_POINTS } from "../config/global";
import { normalizeCentroidRms } from "../normalization/normalize";
import { resampleByArcLength } from "../normalization/resample";
import { applyTopologyFixes } from "../normalization/topology";
import {
  runEarlySecurityChecks,
  runResampledSecurityChecks,
} from "../metrics/security";
import type { LabGameId, LabScoreResult, TimedPoint } from "../types";
import { dist, polylineLength } from "../utils/math";
import { scorePerfectCircle } from "./games/circle";
import { scoreInfinityLoop } from "./games/infinity";
import { scorePerfectSquare, scorePerfectTriangle } from "./games/polygon";

/**
 * Top-level Labs scoring engine — labs.md §9 recommended pipeline.
 */
export function evaluateLabStroke(
  game: LabGameId,
  rawPoints: TimedPoint[],
): LabScoreResult {
  const early = runEarlySecurityChecks(rawPoints);
  if (!early.ok) return early.result;

  const rawArcLength = polylineLength(rawPoints);
  const resampled = resampleByArcLength(rawPoints, TARGET_POINTS);

  const mid = runResampledSecurityChecks(resampled, game, early.flags);
  if (!mid.ok) return mid.result;

  const { points: normalized, centroid, rms } = normalizeCentroidRms(resampled);
  const enforceCcw = game !== "infinity-loop";
  const { points, closureRatio } = applyTopologyFixes(normalized, { enforceCcw });
  const closureGap = dist(points[0]!, points[points.length - 1]!);

  const stroke = {
    points,
    rawArcLength,
    closureRatio,
    closureGap,
    centroid,
    rms,
  };

  switch (game) {
    case "perfect-circle":
      return scorePerfectCircle(stroke, mid.flags);
    case "perfect-square":
      return scorePerfectSquare(stroke, mid.flags);
    case "perfect-triangle":
      return scorePerfectTriangle(stroke, mid.flags);
    case "infinity-loop":
      return scoreInfinityLoop(stroke, mid.flags);
    default: {
      const _exhaustive: never = game;
      return {
        status: "REJECTED_SHAPE",
        final_score: 0,
        total_error: Infinity,
        metrics: [],
        flags: mid.flags,
        message: `Unknown lab game: ${String(_exhaustive)}`,
      };
    }
  }
}
