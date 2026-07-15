import { describe, expect, it } from "vitest";
import {
  arrowHeadPoints,
  bezierPathD,
  defaultBezierHandles,
  dist,
  distToSegment,
  hitTestShape,
  hitTestShapes,
  normalizeRect,
  offsetTransform,
  rectToEllipse,
  resizeRectFromCorner,
  rotateTransform,
  skewTransform,
  translateShape,
} from "../geometry";
import type { WhiteboardShape } from "../types";

function rectShape(partial?: Partial<WhiteboardShape>): WhiteboardShape {
  return {
    id: "r1",
    tool: "rectangle",
    stroke: "#000",
    fill: "none",
    strokeWidth: 2,
    transform: "",
    geometry: { kind: "rectangle", x: 10, y: 20, width: 40, height: 30 },
    createdBy: "p1",
    createdAt: 1,
    ...partial,
  };
}

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

  it("measures distance to segment", () => {
    expect(distToSegment({ x: 5, y: 5 }, { x: 0, y: 0 }, { x: 10, y: 0 })).toBe(5);
    expect(distToSegment({ x: 5, y: 0 }, { x: 0, y: 0 }, { x: 10, y: 0 })).toBe(0);
  });

  it("hit-tests rectangle and picks top-most shape", () => {
    const a = rectShape({ id: "a" });
    const b = rectShape({
      id: "b",
      geometry: { kind: "rectangle", x: 15, y: 25, width: 10, height: 10 },
    });
    expect(hitTestShape(a, { x: 30, y: 35 })).toBe(true);
    expect(hitTestShape(a, { x: 200, y: 200 })).toBe(false);
    expect(hitTestShapes([a, b], { x: 18, y: 28 })?.id).toBe("b");
  });

  it("hit-tests bezier near the curve", () => {
    const curve: WhiteboardShape = {
      id: "c",
      tool: "bezier",
      stroke: "#000",
      fill: "none",
      strokeWidth: 4,
      transform: "",
      geometry: {
        kind: "bezier",
        start: { x: 0, y: 0 },
        end: { x: 100, y: 0 },
        cp1: { x: 30, y: 0 },
        cp2: { x: 70, y: 0 },
      },
      createdBy: "p1",
      createdAt: 1,
    };
    expect(hitTestShape(curve, { x: 50, y: 0 })).toBe(true);
    expect(hitTestShape(curve, { x: 50, y: 80 })).toBe(false);
  });

  it("translates shapes and offsets rotate centers", () => {
    const moved = translateShape(rectShape({ transform: "rotate(10 30 35)" }), 5, -3);
    expect(moved.geometry).toEqual({
      kind: "rectangle",
      x: 15,
      y: 17,
      width: 40,
      height: 30,
    });
    expect(moved.transform).toBe("rotate(10 35 32)");
  });

  it("resizes rect from corner", () => {
    const box = resizeRectFromCorner(
      { x: 10, y: 10, width: 40, height: 20 },
      "se",
      { x: 70, y: 50 },
      false,
    );
    expect(box).toEqual({ x: 10, y: 10, width: 60, height: 40 });
  });

  it("offsets rotate transform origins", () => {
    expect(offsetTransform("rotate(45 10 20)", 2, 3)).toBe("rotate(45 12 23)");
  });
});
