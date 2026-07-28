import { SQUARE_CONFIG, TRIANGLE_CONFIG, type GameScoreConfig } from "../../config/games";
import { dynamicRdpCorners } from "../../algorithms/rdp";
import { computePolygonMetrics } from "../../metrics/polygon";
import { kinematicConfidenceError, tafDerivativeVariance } from "../../metrics/taf";
import { emptyFlags } from "../../metrics/security";
import { buildMetricBreakdown, scoreFromTotalError } from "../../scoring/exponential";
import type { AntiCheatFlags, LabScoreResult, NormalizedStroke } from "../../types";

export function scorePerfectSquare(
  stroke: NormalizedStroke,
  flags: AntiCheatFlags = emptyFlags(),
): LabScoreResult {
  return scorePolygon(stroke, SQUARE_CONFIG, "orthogonality", flags);
}

export function scorePerfectTriangle(
  stroke: NormalizedStroke,
  flags: AntiCheatFlags = emptyFlags(),
): LabScoreResult {
  return scorePolygon(stroke, TRIANGLE_CONFIG, "angles", flags);
}

function scorePolygon(
  stroke: NormalizedStroke,
  config: GameScoreConfig,
  angleMetricId: string,
  flags: AntiCheatFlags,
): LabScoreResult {
  const target = config.targetVertices ?? 4;
  const ideal = config.idealAngleRad ?? Math.PI / 2;
  const rdp = dynamicRdpCorners(stroke.points, target);

  if (!rdp.found || rdp.indices.length !== target) {
    return {
      status: "REJECTED_SHAPE",
      final_score: 0,
      total_error: Infinity,
      metrics: [],
      flags,
      message: `Could not find exactly ${target} corners — not a clear polygon.`,
    };
  }

  const poly = computePolygonMetrics(stroke.points, rdp.indices, ideal);
  const confidence = kinematicConfidenceError(stroke.points);
  const tafVar = tafDerivativeVariance(stroke.points);
  if (tafVar < 1e-12) {
    flags = { ...flags, is_hardware_assisted: true };
  }

  const values: Record<string, number> = {
    [angleMetricId]: poly.angleError,
    straightness: poly.straightness,
    side_equality: poly.sideEquality,
    closure: stroke.closureRatio,
    confidence,
  };

  const { metrics, totalError } = buildMetricBreakdown(
    values,
    config.metrics,
    config.decayK,
  );

  return {
    status: "VALID",
    final_score: scoreFromTotalError(totalError, config.decayK),
    total_error: totalError,
    metrics,
    flags,
  };
}
