import { SCORE_FLOOR } from "../config/global";
import type { MetricWeight } from "../config/games";
import type { MetricBreakdownItem } from "../types";
import { round2 } from "../utils/math";

/**
 * Build weighted metric rows and E_total — labs.md §4 / §5.
 * S = 100 · e^(−k · E_total); scores under SCORE_FLOOR map to 0.
 */
export function buildMetricBreakdown(
  values: Record<string, number>,
  weights: readonly MetricWeight[],
  decayK: number,
): { metrics: MetricBreakdownItem[]; totalError: number } {
  const metrics: MetricBreakdownItem[] = [];
  let totalError = 0;

  for (const w of weights) {
    const error = Math.max(0, values[w.id] ?? 0);
    const weightedError = w.weight * error;
    totalError += weightedError;
    metrics.push({
      id: w.id,
      label: w.label,
      error,
      weight: w.weight,
      weightedError,
      score: errorToPercent(error, decayK),
    });
  }

  return { metrics, totalError };
}

export function errorToPercent(error: number, decayK: number): number {
  if (!Number.isFinite(error)) return 0;
  const raw = 100 * Math.exp(-decayK * error);
  return finalizeScore(raw);
}

export function finalizeScore(raw: number): number {
  if (!Number.isFinite(raw) || raw < SCORE_FLOOR) return 0;
  return round2(Math.min(100, raw));
}

export function scoreFromTotalError(totalError: number, decayK: number): number {
  return errorToPercent(totalError, decayK);
}
