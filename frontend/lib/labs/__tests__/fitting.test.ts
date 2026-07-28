import { describe, expect, it } from "vitest";
import { fitCircleTaubin } from "../algorithms/taubin";
import { dynamicRdpCorners } from "../algorithms/rdp";
import { ordinaryProcrustes, scaleToUnitRms } from "../algorithms/procrustes";
import { bestCyclicShift, generateLemniscate } from "../algorithms/lemniscate";
import { preprocessStroke } from "../normalization";
import { makeCircle, makeInfinity, makeSquare, makeTriangle } from "./fixtures";

describe("Taubin circle fit", () => {
  it("recovers radius of a perfect circle in normalized space", () => {
    const stroke = preprocessStroke(makeCircle("perfect"));
    const fit = fitCircleTaubin(stroke.points);
    expect(fit).not.toBeNull();
    // Unit-RMS circle of radius R has RMS = R, so R ≈ 1.
    expect(fit!.radius).toBeGreaterThan(0.9);
    expect(fit!.radius).toBeLessThan(1.1);
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

describe("Ordinary Procrustes + lemniscate", () => {
  it("aligns a perfect infinity stroke with near-zero residual", () => {
    const stroke = preprocessStroke(makeInfinity("perfect"), { enforceCcw: false });
    const ref = generateLemniscate(stroke.points.length);
    const user = scaleToUnitRms(stroke.points);
    const a = ordinaryProcrustes(bestCyclicShift(user, ref), ref);
    const b = ordinaryProcrustes(bestCyclicShift([...user].reverse(), ref), ref);
    const best = Math.min(a.rmsDistance, b.rmsDistance);
    expect(best).toBeLessThan(0.12);
  });
});
