/** Global engine constants — labs.md §10. */

export const TARGET_POINTS = 1000;

/** Lab canvas SVG viewBox size — must match LabChallengeCanvas. */
export const LAB_CANVAS_WIDTH = 640;
export const LAB_CANVAS_HEIGHT = 400;

/** Fixed celestial / universal origin at the canvas center. */
export const LAB_CANVAS_CENTER = {
  x: LAB_CANVAS_WIDTH / 2,
  y: LAB_CANVAS_HEIGHT / 2,
} as const;

/**
 * Minimum |winding| around the fixed origin for closed shapes.
 * Below this the stroke does not encircle the center → score 0.
 */
export const CENTER_WINDING_MIN = 0.55;

/**
 * Max |centroid| of the stroke (unit-RMS, fixed-origin space).
 * Larger means the drawing is not centered on the celestial axis → score 0.
 */
export const CENTER_OFFSET_MAX = 0.42;

/**
 * Max distance of an infinity self-crossing from the origin before reject.
 * Lemniscate of Bernoulli must collide near (0,0) on the x-axis form.
 */
export const INFINITY_INTERSECTION_MAX = 0.35;

/** Max gap (ratio to total arc length) permitted for synthetic closure. */
export const CLOSURE_THRESHOLD = 0.05;

/** Fraction of the stroke blended at each end when closing a gap. */
export const CLOSURE_BLEND_FRACTION = 0.025;

/** Minimum raw exponential score before forced to 0. */
export const SCORE_FLOOR = 30.0;

/** Minimum points required before evaluation. */
export const MIN_RAW_POINTS = 16;

/** Minimum RMS scale in original coords (reject tiny scribbles). */
export const MIN_BBOX_SPAN = 8;

/** Isoperimetric quotient below this → REJECTED_SCRIBBLE. Q_circle = 1. */
export const ISOPERIMETRIC_REJECT = 0.2;

/** Velocity variance below this → synthetic / bot. */
export const VELOCITY_VARIANCE_BOT = 0.001;

/** Absolute turning angle above this (rad) → multiple loops. */
export const MULTI_LOOP_TURNING = 3.5 * Math.PI;

/** Completion time above this (ms) → tracing suspicion. */
export const TRACING_TIME_MS = 10_000;

/** RDP binary-search iterations for polygon vertex isolation. */
export const RDP_BINARY_SEARCH_ITERS = 20;

/** RDP epsilon search range in RMS-normalized space. */
export const RDP_EPS_MIN = 0;
export const RDP_EPS_MAX = 2.0;

/** Gaussian window σ (in samples) for TAF derivative smoothing. */
export const TAF_SMOOTH_SIGMA = 2.5;
