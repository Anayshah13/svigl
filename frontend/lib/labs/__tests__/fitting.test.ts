import { describe, expect, it } from "vitest";
import { fitCircleTaubin } from "../algorithms/taubin";
import { dynamicRdpCorners } from "../algorithms/rdp";
import { ordinaryProcrustes, scaleToUnitRms } from "../algorithms/procrustes";
import { bestCyclicShift, generateLemniscate } from "../algorithms/lemniscate";
import { preprocessStroke } from "../normalization";
import { makeCircle, makeInfinity, makeSquare, makeTriangle } from "./fixtures";

describe("fixed-origin circle", () => {
  it("places a perfect circle near the unit-RMS radius around the origin", () => {
    const stroke = preprocessStroke(makeCircle("perfect"));
    let meanR = 0;
    for (const p of stroke.points) meanR += Math.hypot(p.x, p.y);
    meanR /= stroke.points.length;
    expect(meanR).toBeGreaterThan(0.9);
    expect(meanR).toBeLessThan(1.1);
    const fit = fitCircleTaubin(stroke.points);
    expect(fit).not.toBeNull();
    expect(Math.hypot(fit!.center.x, fit!.center.y)).toBeLessThan(0.05);
  });
});

describe("Dynamic RDP", () => {
  it("isolates 4 corners on a perfect square", () => {
    const stroke = preprocessStroke(makeSquare("perfect"));
    const rdp = dynamicRdpCorners(stroke.points, 4);
    expect(rdp.found).toBe(true);
    expect(rdp.indices).toHaveLength(4);
  });

  it("isolates 3 corners on a perfect triangle", () => {
    const stroke = preprocessStroke(makeTriangle("perfect"));
    const rdp = dynamicRdpCorners(stroke.points, 3);
    expect(rdp.found).toBe(true);
    expect(rdp.indices).toHaveLength(3);
  });
});

describe("axis-locked lemniscate match", () => {
  it("matches a perfect infinity stroke without free rotation", () => {
    const stroke = preprocessStroke(makeInfinity("perfect"), { enforceCcw: false });
    const ref = generateLemniscate(stroke.points.length);
    const user = scaleToUnitRms(stroke.points);
    const a = bestCyclicShift(user, ref);
    const b = bestCyclicShift([...user].reverse(), ref);
    const rms = (pts: typeof a) => {
      let s = 0;
      for (let i = 0; i < pts.length; i++) {
        const p = pts[i]!;
        const q = ref[i]!;
        s += (p.x - q.x) ** 2 + (p.y - q.y) ** 2;
      }
      return Math.sqrt(s / pts.length);
    };
    expect(Math.min(rms(a), rms(b))).toBeLessThan(0.12);
    // Free Procrustes should still work as a sanity check on the fixture.
    const rotated = ordinaryProcrustes(a, ref);
    expect(rotated.rmsDistance).toBeLessThan(0.12);
  });
});
