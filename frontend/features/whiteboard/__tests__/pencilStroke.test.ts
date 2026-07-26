import { describe, expect, it } from "vitest";
import {
  buildPencilPathD,
  finalizePencilPath,
  mapPencilPathPoints,
  PENCIL_MIN_SAMPLE_DISTANCE,
  pencilPathAnchors,
  pushPencilSample,
  simplifyPoints,
} from "../pencilStroke";
import type { Point } from "../types";

describe("pencilStroke", () => {
  it("keeps endpoints and drops points inside the RDP tolerance", () => {
    const pts: Point[] = [
      { x: 0, y: 0 },
      { x: 5, y: 0.1 },
      { x: 10, y: 0 },
      { x: 15, y: 5 },
      { x: 20, y: 0 },
    ];
    const simplified = simplifyPoints(pts, 1);
    expect(simplified[0]).toEqual(pts[0]);
    expect(simplified[simplified.length - 1]).toEqual(pts[pts.length - 1]);
    // The near-colinear midpoint (5, 0.1) should drop; the corner (15, 5) stays.
    expect(simplified.some((p) => p.x === 15 && p.y === 5)).toBe(true);
    expect(simplified.length).toBeLessThan(pts.length);
  });

  it("skips samples that are closer than the minimum distance", () => {
    const buf: Point[] = [];
    expect(pushPencilSample(buf, { x: 0, y: 0 })).toBe(true);
    expect(pushPencilSample(buf, { x: 0.1, y: 0 })).toBe(false);
    expect(pushPencilSample(buf, { x: PENCIL_MIN_SAMPLE_DISTANCE * 2, y: 0 })).toBe(
      true,
    );
    expect(buf).toHaveLength(2);
  });

  it("builds a single-point path as a self-loop for round-cap dots", () => {
    const d = buildPencilPathD([{ x: 3, y: 4 }]);
    expect(d).toBe("M 3 4 L 3 4");
  });

  it("builds a two-point path as a straight line", () => {
    const d = buildPencilPathD([
      { x: 0, y: 0 },
      { x: 10, y: 0 },
    ]);
    expect(d).toBe("M 0 0 L 10 0");
  });

  it("uses quadratic bezier segments through midpoints for smoothing", () => {
    const d = buildPencilPathD([
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 20, y: 0 },
      { x: 30, y: 0 },
    ]);
    // Contains a Q command joining midpoints of consecutive samples.
    expect(d).toMatch(/^M 0 0 Q 10 0 15 0/);
    expect(d.endsWith(" L 30 0")).toBe(true);
  });

  it("recovers on-curve anchor points from a smoothed d string", () => {
    const raw: Point[] = [
      { x: 0, y: 0 },
      { x: 10, y: 5 },
      { x: 20, y: 5 },
      { x: 30, y: 0 },
    ];
    const anchors = pencilPathAnchors(buildPencilPathD(raw));
    expect(anchors[0]).toEqual({ x: 0, y: 0 });
    expect(anchors[anchors.length - 1]).toEqual({ x: 30, y: 0 });
  });

  it("maps every coordinate through a transform without losing shape", () => {
    const d = buildPencilPathD([
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 20, y: 0 },
      { x: 30, y: 0 },
    ]);
    const translated = mapPencilPathPoints(d, (p) => ({ x: p.x + 5, y: p.y + 2 }));
    const anchors = pencilPathAnchors(translated);
    expect(anchors[0]).toEqual({ x: 5, y: 2 });
    expect(anchors[anchors.length - 1]).toEqual({ x: 35, y: 2 });
  });

  it("finalizes with tolerance scaled by stroke width", () => {
    // Amplitude large enough that a thin stroke retains most jitter while a
    // thick stroke's higher tolerance collapses it back toward a straight line.
    const noisy: Point[] = Array.from({ length: 60 }, (_, i) => ({
      x: i,
      y: Math.sin(i * 0.6) * 3,
    }));
    const thin = finalizePencilPath(noisy, 1);
    const thick = finalizePencilPath(noisy, 20);
    expect(thick.length).toBeLessThan(thin.length);
    const anchors = pencilPathAnchors(thick);
    expect(anchors[0]).toEqual({ x: 0, y: noisy[0]!.y });
    expect(anchors[anchors.length - 1]!.x).toBeCloseTo(59, 5);
  });
});
