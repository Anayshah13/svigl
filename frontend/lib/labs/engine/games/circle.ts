import { CIRCLE_CONFIG } from "../../config/games";
import { fitCircleTaubin } from "../../algorithms/taubin";
import {
  circleMaxDeviation,
  circleRmse,
  hausdorffDistance,
  sampleCircle,
} from "../../metrics/circle";
import { kinematicConfidenceError, tafDerivativeVariance } from "../../metrics/taf";
import { buildMetricBreakdown, scoreFromTotalError } from "../../scoring/exponential";
import type { AntiCheatFlags, LabScoreResult, NormalizedStroke } from "../../types";
import { emptyFlags } from "../../metrics/security";

export function scorePerfectCircle(
  stroke: NormalizedStroke,
  flags: AntiCheatFlags = emptyFlags(),
): LabScoreResult {
  const fit = fitCircleTaubin(stroke.points);
  if (!fit || !(fit.radius > 1e-6)) {
    return {
      status: "REJECTED_SHAPE",
      final_score: 0,
      total_error: Infinity,
      metrics: [],
      flags,
      message: "Could not fit a circle to this stroke.",
    };
  }

  const roundness = circleRmse(stroke.points, fit.center, fit.radius);
  const radialMax = circleMaxDeviation(stroke.points, fit.center, fit.radius);
  const ideal = sampleCircle(fit.center, fit.radius, 256);
  const hausdorff = hausdorffDistance(stroke.points, ideal);
  const maxDeviation = Math.max(radialMax, hausdorff);

  const smoothness = tafDerivativeVariance(stroke.points);
  const confidence = kinematicConfidenceError(stroke.points);
  const closure = stroke.closureRatio;

  if (smoothness < 1e-12) {
    flags = { ...flags, is_hardware_assisted: true };
  }

  const { metrics, totalError } = buildMetricBreakdown(
    {
      roundness,
      smoothness,
      max_deviation: maxDeviation,
      closure,
      confidence,
    },
    CIRCLE_CONFIG.metrics,
    CIRCLE_CONFIG.decayK,
  );

  return {
    status: "VALID",
    final_score: scoreFromTotalError(totalError, CIRCLE_CONFIG.decayK),
    total_error: totalError,
    metrics,
    flags,
  };
}
