import { describe, expect, it } from "vitest";
import {
  arrowHeadPoints,
  bezierPathD,
  defaultBezierHandles,
  dist,
  normalizeRect,
  rectToEllipse,
  rotateTransform,
  skewTransform,
} from "../geometry";

describe("geometry", () => {
  it("computes distance", () => {
    expect(dist({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5);
  });

  it("builds cubic bezier d", () => {
    expect(
      bezierPathD(
        { x: 0, y: 0 },
        { x: 10, y: 20 },
        { x: 30, y: 20 },
        { x: 40, y: 0 },
      ),
    ).toBe("M 0 0 C 10 20 30 20 40 0");
  });

  it("defaults bezier handles along chord", () => {
    const { cp1, cp2 } = defaultBezierHandles({ x: 0, y: 0 }, { x: 90, y: 0 });
    expect(cp1).toEqual({ x: 30, y: 0 });
    expect(cp2).toEqual({ x: 60, y: 0 });
  });

  it("normalizes rect and square lock", () => {
    expect(normalizeRect(10, 10, 40, 30, false)).toEqual({
      x: 10,
      y: 10,
      width: 30,
      height: 20,
    });
    expect(normalizeRect(10, 10, 40, 30, true)).toEqual({
      x: 10,
      y: 10,
      width: 30,
      height: 30,
    });
  });

  it("converts drag box to ellipse / circle", () => {
    expect(rectToEllipse(0, 0, 100, 50, false)).toEqual({
      cx: 50,
      cy: 25,
      rx: 50,
      ry: 25,
    });
    expect(rectToEllipse(0, 0, 100, 50, true).rx).toBe(
      rectToEllipse(0, 0, 100, 50, true).ry,
    );
  });

  it("builds rotate and skew transforms", () => {
    expect(rotateTransform(40, 30, 15)).toBe("rotate(15 40 30)");
    expect(rotateTransform(0, 0, 0)).toBe("");
    expect(skewTransform(20, 10, 50)).toContain("skewX(20)");
  });

  it("produces arrowhead triangle points", () => {
    const pts = arrowHeadPoints({ x: 0, y: 0 }, { x: 100, y: 0 }, 10);
    const nums = pts.split(/[\s,]+/).map(Number);
    expect(nums).toHaveLength(6);
    expect(nums[0]).toBe(100);
    expect(nums[1]).toBe(0);
  });
});
