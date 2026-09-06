import { describe, expect, it } from "vitest";
import { AI_GUESSER_CONFIG } from "../config";
import {
  changeScore,
  createShapeMetricsCache,
  emptySignature,
  isEmptySignature,
  signaturesEqual,
  summarizeShapes,
} from "../changeDetector";
import {
  BASE_STROKE,
  SECOND_STROKE,
  THIRD_STROKE,
  TINY_EXTENSION,
} from "./fixtures";

const config = AI_GUESSER_CONFIG;

describe("summarizeShapes", () => {
  it("treats an empty board as empty", () => {
    const signature = summarizeShapes([]);
    expect(isEmptySignature(signature)).toBe(true);
    expect(signature.fingerprint).toBe(emptySignature().fingerprint);
  });

  it("measures shape count, points, length, and bbox", () => {
    const signature = summarizeShapes([BASE_STROKE]);
    expect(signature.shapeCount).toBe(1);
    expect(signature.pointCount).toBe(3);
    expect(signature.totalLength).toBeCloseTo(600, 5);
    expect(signature.bbox).toEqual({
      minX: 100,
      minY: 100,
      maxX: 400,
      maxY: 400,
    });
    expect(isEmptySignature(signature)).toBe(false);
  });

  it("is deterministic and order-sensitive on identity", () => {
    const a = summarizeShapes([BASE_STROKE, SECOND_STROKE]);
    const b = summarizeShapes([BASE_STROKE, SECOND_STROKE]);
    expect(signaturesEqual(a, b)).toBe(true);

    const reordered = summarizeShapes([SECOND_STROKE, BASE_STROKE]);
    expect(signaturesEqual(a, reordered)).toBe(false);
  });

  it("reuses cached metrics when a shape is unchanged", () => {
    const cache = createShapeMetricsCache();
    const first = summarizeShapes([BASE_STROKE], cache);
    const second = summarizeShapes([BASE_STROKE], cache);
    expect(first.fingerprint).toBe(second.fingerprint);
  });

  it("invalidates cached metrics when path data changes", () => {
    const cache = createShapeMetricsCache();
    const before = summarizeShapes([BASE_STROKE], cache);
    const after = summarizeShapes([TINY_EXTENSION], cache);
    expect(before.fingerprint).not.toBe(after.fingerprint);
    expect(after.totalLength).toBeGreaterThan(before.totalLength);
  });

  it("treats a transform or color change as a new signature", () => {
    const cache = createShapeMetricsCache();
    const moved = { ...BASE_STROKE, transform: "translate(40 0)" };
    const recoloured = { ...BASE_STROKE, stroke: "#ef4444" };
    const base = summarizeShapes([BASE_STROKE], cache);
    expect(summarizeShapes([moved], cache).fingerprint).not.toBe(base.fingerprint);
    expect(summarizeShapes([recoloured], cache).fingerprint).not.toBe(
      base.fingerprint,
    );
  });
});

describe("changeScore", () => {
  it("scores an empty board as no change", () => {
    expect(changeScore(null, summarizeShapes([]), config)).toBe(0);
  });

  it("scores the very first ink as a full change", () => {
    expect(changeScore(null, summarizeShapes([BASE_STROKE]), config)).toBe(1);
  });

  it("scores an identical drawing as zero", () => {
    const signature = summarizeShapes([BASE_STROKE]);
    expect(changeScore(signature, summarizeShapes([BASE_STROKE]), config)).toBe(
      0,
    );
  });

  it("scores a small stroke extension below the call threshold", () => {
    const before = summarizeShapes([BASE_STROKE]);
    const after = summarizeShapes([TINY_EXTENSION]);
    const score = changeScore(before, after, config);

    expect(score).toBeGreaterThan(config.TINY_CHANGE_SCORE);
    expect(score).toBeLessThan(config.MIN_CHANGE_SCORE);
  });

  it("scores a new stroke above the call threshold", () => {
    const before = summarizeShapes([BASE_STROKE]);
    const after = summarizeShapes([BASE_STROKE, SECOND_STROKE]);
    expect(changeScore(before, after, config)).toBeGreaterThanOrEqual(
      config.MIN_CHANGE_SCORE,
    );
  });

  it("scores several new strokes as a significant change", () => {
    const before = summarizeShapes([BASE_STROKE]);
    const after = summarizeShapes([BASE_STROKE, SECOND_STROKE, THIRD_STROKE]);
    expect(changeScore(before, after, config)).toBeGreaterThanOrEqual(
      config.SIGNIFICANT_CHANGE_SCORE,
    );
  });

  it("registers a moved or recoloured stroke as a structural change", () => {
    const before = summarizeShapes([BASE_STROKE]);
    const moved = summarizeShapes([
      { ...BASE_STROKE, transform: "translate(40 0)" },
    ]);
    expect(changeScore(before, moved, config)).toBeCloseTo(
      config.STRUCTURAL_CHANGE_SCORE,
      5,
    );
  });

  it("registers erasing as a structural change even though no ink was added", () => {
    const before = summarizeShapes([BASE_STROKE, SECOND_STROKE]);
    const after = summarizeShapes([BASE_STROKE]);
    expect(changeScore(before, after, config)).toBeCloseTo(
      config.STRUCTURAL_CHANGE_SCORE,
      5,
    );
  });

  it("never exceeds 1", () => {
    const before = summarizeShapes([BASE_STROKE]);
    const many = [BASE_STROKE];
    for (let i = 0; i < 40; i += 1) {
      many.push({ ...SECOND_STROKE, id: `bulk-${i}` });
    }
    expect(changeScore(before, summarizeShapes(many), config)).toBe(1);
  });
});
