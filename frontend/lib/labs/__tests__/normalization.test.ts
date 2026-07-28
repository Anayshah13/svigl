import { describe, expect, it } from "vitest";
import { normalizeCentroidRms } from "../normalization/normalize";
import { resampleByArcLength } from "../normalization/resample";
import { applyTopologyFixes } from "../normalization/topology";
import { TARGET_POINTS } from "../config/global";
import { makeCircle } from "./fixtures";
import { centroidOf, rmsFromOrigin } from "../utils/math";

describe("resampleByArcLength", () => {
  it("emits exactly M equidistant samples", () => {
    const raw = makeCircle("good", 80);
    const out = resampleByArcLength(raw, TARGET_POINTS);
    expect(out).toHaveLength(TARGET_POINTS);

    // Adjacent spacing should be nearly uniform.
    const spacings: number[] = [];
    for (let i = 1; i < out.length; i++) {
      spacings.push(
        Math.hypot(out[i]!.x - out[i - 1]!.x, out[i]!.y - out[i - 1]!.y),
      );
    }
    const mean = spacings.reduce((a, b) => a + b, 0) / spacings.length;
    const maxDev = Math.max(...spacings.map((s) => Math.abs(s - mean)));
    expect(maxDev / mean).toBeLessThan(0.05);
  });
});

describe("normalizeCentroidRms", () => {
  it("centers at origin and scales RMS to 1", () => {
    const raw = makeCircle("perfect", 120);
    const resampled = resampleByArcLength(raw, 200);
    const { points } = normalizeCentroidRms(resampled);
    const c = centroidOf(points);
    expect(Math.abs(c.x)).toBeLessThan(1e-9);
    expect(Math.abs(c.y)).toBeLessThan(1e-9);
    expect(Math.abs(rmsFromOrigin(points) - 1)).toBeLessThan(1e-9);
  });
});

describe("applyTopologyFixes", () => {
  it("closes near-closed loops and enforces CCW", () => {
    const raw = makeCircle("perfect", 100);
    // Force clockwise by reversing.
    const cw = [...raw].reverse();
    const resampled = resampleByArcLength(cw, 200);
    const { points } = normalizeCentroidRms(resampled);
    const fixed = applyTopologyFixes(points, { enforceCcw: true });
    expect(fixed.wasClosed).toBe(true);
    expect(fixed.closureRatio).toBeLessThan(0.05);

    // Shoelace should be positive (CCW).
    let area = 0;
    for (let i = 0; i < fixed.points.length; i++) {
      const p = fixed.points[i]!;
      const q = fixed.points[(i + 1) % fixed.points.length]!;
      area += p.x * q.y - q.x * p.y;
    }
    expect(area).toBeGreaterThan(0);
  });
});
