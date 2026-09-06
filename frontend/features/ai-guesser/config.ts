/**
 * Tunables for the experimental AI Guesser mode.
 *
 * Everything the calling policy depends on lives here so the cadence can be
 * retuned without touching the detector, scheduler, or UI.
 */

export interface AiGuesserConfig {
  /** Hard floor between two AI calls, even for a dramatic change. */
  MIN_CALL_INTERVAL_MS: number;
  /** Preferred cadence while the drawing keeps changing meaningfully. */
  TARGET_CALL_INTERVAL_MS: number;
  /** Past this, accept even a tiny change so the panel does not go cold. */
  MAX_IDLE_INTERVAL_MS: number;
  /** How often the scheduler re-evaluates. Cheap: no network, no rasterizing. */
  TICK_INTERVAL_MS: number;
  /** Quiet period that counts as "player stopped drawing". */
  IDLE_SETTLE_MS: number;

  /** Below this, a change is not worth a call yet. */
  MIN_CHANGE_SCORE: number;
  /** At/above this, jump the target cadence (still respects the floor). */
  SIGNIFICANT_CHANGE_SCORE: number;
  /** Floor for "something actually changed" during an idle refresh. */
  TINY_CHANGE_SCORE: number;

  /** New shapes needed to score 1.0 on the shape-count signal. */
  NEW_SHAPE_SATURATION: number;
  /** New stroke length (board units) needed to score 1.0. */
  NEW_LENGTH_SATURATION: number;
  /** Relative bounding-box growth needed to score 1.0. */
  BBOX_GROWTH_SATURATION: number;
  /** Score assigned when ink was edited/erased rather than added. */
  STRUCTURAL_CHANGE_SCORE: number;

  /** Exponential-moving-average weight for a newly reported confidence. */
  SMOOTHING_ALPHA: number;
  /** Per-response decay for answers the model stopped reporting. */
  SMOOTHING_DECAY: number;
  /** Drop smoothed answers below this. */
  SMOOTHING_MIN_KEEP: number;
  /** Top-two gap under which the UI admits it is unsure. */
  UNCERTAIN_MARGIN: number;
  /** Leading confidence under which the UI admits it is unsure. */
  UNCERTAIN_CEILING: number;

  /** Max guesses tracked and displayed. */
  MAX_GUESSES: number;

  /** Square snapshot edge in px sent to the model. Keep small — sketches. */
  SNAPSHOT_SIZE: number;
  /** Client-side abort deadline for one AI call. */
  REQUEST_TIMEOUT_MS: number;
  /** Base cool-off after a failure; grows linearly per consecutive failure. */
  ERROR_BACKOFF_MS: number;
  MAX_ERROR_BACKOFF_MS: number;
  /** How long the "Guess updated" flash lasts before returning to watching. */
  STATUS_UPDATED_MS: number;
  /** Consecutive failures before the UI switches to "unavailable". */
  UNAVAILABLE_AFTER_ERRORS: number;

  /**
   * Accept a slightly stale response if the drawing drifted less than this
   * while the request was in flight. 0 rejects every superseded version.
   */
  ACCEPT_STALE_BELOW_SCORE: number;
}

export const AI_GUESSER_CONFIG: AiGuesserConfig = {
  // 4000ms => 15 RPM max, matching typical free-tier Flash-Lite quota.
  MIN_CALL_INTERVAL_MS: 4000,
  TARGET_CALL_INTERVAL_MS: 5000,
  MAX_IDLE_INTERVAL_MS: 8000,
  TICK_INTERVAL_MS: 400,
  IDLE_SETTLE_MS: 700,

  MIN_CHANGE_SCORE: 0.12,
  SIGNIFICANT_CHANGE_SCORE: 0.55,
  TINY_CHANGE_SCORE: 0.02,

  NEW_SHAPE_SATURATION: 3,
  NEW_LENGTH_SATURATION: 900,
  BBOX_GROWTH_SATURATION: 0.45,
  STRUCTURAL_CHANGE_SCORE: 0.3,

  SMOOTHING_ALPHA: 0.65,
  SMOOTHING_DECAY: 0.7,
  SMOOTHING_MIN_KEEP: 0.02,
  UNCERTAIN_MARGIN: 0.12,
  UNCERTAIN_CEILING: 0.4,

  MAX_GUESSES: 3,

  SNAPSHOT_SIZE: 256,
  REQUEST_TIMEOUT_MS: 20000,
  ERROR_BACKOFF_MS: 4000,
  MAX_ERROR_BACKOFF_MS: 16000,
  STATUS_UPDATED_MS: 1400,
  UNAVAILABLE_AFTER_ERRORS: 2,

  ACCEPT_STALE_BELOW_SCORE: 0.35,
};

export function resolveConfig(
  overrides?: Partial<AiGuesserConfig>,
): AiGuesserConfig {
  return overrides ? { ...AI_GUESSER_CONFIG, ...overrides } : AI_GUESSER_CONFIG;
}

export {
  AI_GUESSER_CANDIDATES,
  AI_GUESSER_WORDS,
  emojiFor,
} from "./words";
