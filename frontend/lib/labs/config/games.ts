import type { LabGameId } from "../types";

/**
 * Per-game scoring configuration — labs.md §10.
 * Adding a lab: append a GameScoreConfig and a fitter in engine/games/.
 */

export type MetricWeight = {
  id: string;
  label: string;
  weight: number;
};

export type GameScoreConfig = {
  id: LabGameId;
  /** Exponential decay constant k in S = 100 * e^(-k * E_total). */
  decayK: number;
  metrics: readonly MetricWeight[];
  /** Polygon RDP target corner count (square=4, triangle=3). */
  targetVertices?: number;
  /** Ideal internal angle in radians. */
  idealAngleRad?: number;
};

export const CIRCLE_CONFIG: GameScoreConfig = {
  id: "perfect-circle",
  decayK: 1.35,
  metrics: [
    { id: "roundness", label: "Radius Consistency", weight: 0.6 },
    { id: "smoothness", label: "Smoothness", weight: 0.15 },
    { id: "max_deviation", label: "Max Deviation", weight: 0.1 },
    { id: "closure", label: "Closure", weight: 0.1 },
    { id: "confidence", label: "Confidence", weight: 0.05 },
  ],
};

export const SQUARE_CONFIG: GameScoreConfig = {
  id: "perfect-square",
  decayK: 1.5,
  targetVertices: 4,
  idealAngleRad: Math.PI / 2,
  metrics: [
    { id: "orthogonality", label: "Corner Orthogonality", weight: 0.4 },
    { id: "straightness", label: "Edge Straightness", weight: 0.3 },
    { id: "side_equality", label: "Side Equality", weight: 0.15 },
    { id: "closure", label: "Closure", weight: 0.1 },
    { id: "confidence", label: "Confidence", weight: 0.05 },
  ],
};

export const TRIANGLE_CONFIG: GameScoreConfig = {
  id: "perfect-triangle",
  decayK: 1.45,
  targetVertices: 3,
  idealAngleRad: Math.PI / 3,
  metrics: [
    { id: "angles", label: "Equilateral Angles", weight: 0.4 },
    { id: "straightness", label: "Edge Straightness", weight: 0.3 },
    { id: "side_equality", label: "Side Equality", weight: 0.15 },
    { id: "closure", label: "Closure", weight: 0.1 },
    { id: "confidence", label: "Confidence", weight: 0.05 },
  ],
};

export const INFINITY_CONFIG: GameScoreConfig = {
  id: "infinity-loop",
  decayK: 1.05,
  metrics: [
    { id: "procrustes", label: "Shape Match", weight: 0.45 },
    { id: "symmetry", label: "Lobe Symmetry", weight: 0.25 },
    { id: "intersection", label: "Intersection", weight: 0.15 },
    { id: "smoothness", label: "Smoothness", weight: 0.1 },
    { id: "confidence", label: "Confidence", weight: 0.05 },
  ],
};

export const GAME_CONFIGS: Record<LabGameId, GameScoreConfig> = {
  "perfect-circle": CIRCLE_CONFIG,
  "perfect-square": SQUARE_CONFIG,
  "perfect-triangle": TRIANGLE_CONFIG,
  "infinity-loop": INFINITY_CONFIG,
};
