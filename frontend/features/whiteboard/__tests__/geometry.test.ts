import { describe, expect, it } from "vitest";
import {
  arrowHeadPoints,
  bezierCurveControl,
  bezierPathD,
  clampGeometryPointsToBoard,
  clampPointToBoard,
  constrainShapeToBoard,
  cubicFromCurveControl,
  defaultBezierHandles,
  dist,
  distToSegment,
  groupSelectionBounds,
  groupShapeBounds,
  hitTestShape,
  hitTestShapes,
  mapBoxThroughGroup,
  normalizeRect,
  offsetTransform,
  rectToEllipse,
  resizeRectFromCorner,
  resizeRectFromHandle,
  rotateTransform,
  scaleShapeToBox,
  scaleShapesToGroupBox,
  shapeBounds,
  shapeVisualBounds,
  shapesInMarquee,
  skewTransform,
  snapCoord,
  snapPoint,
  maybeSnapCoord,
  maybeSnapPoint,
  translateShape,
} from "../geometry";
import { GRID_SIZE, type WhiteboardShape } from "../types";

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

  it("elevates a single curve control into cubic handles", () => {
    const { cp1, cp2 } = cubicFromCurveControl(
      { x: 0, y: 0 },
      { x: 90, y: 0 },
      { x: 45, y: 30 },
    );
    expect(cp1.x).toBeCloseTo(30);
    expect(cp1.y).toBeCloseTo(20);
    expect(cp2.x).toBeCloseTo(60);
    expect(cp2.y).toBeCloseTo(20);
    const control = bezierCurveControl(
      { x: 0, y: 0 },
      cp1,
      cp2,
      { x: 90, y: 0 },
    );
    expect(control.x).toBeCloseTo(45);
    expect(control.y).toBeCloseTo(30);
  });

  it("bezierCurveControl sits at the unified quadratic control (stem intersection)", () => {
    const start = { x: 400, y: 180 };
    const end = { x: 520, y: 460 };
    const intended = { x: 280, y: 420 };
    const { cp1, cp2 } = cubicFromCurveControl(start, end, intended);

    // Elevated quadratic: start→cp1 and end→cp2 are colinear with start→control
    // and end→control, so the UI stems meet at `intended`.
    expect(cp1.x).toBeCloseTo(start.x + (2 / 3) * (intended.x - start.x));
    expect(cp1.y).toBeCloseTo(start.y + (2 / 3) * (intended.y - start.y));
    expect(cp2.x).toBeCloseTo(end.x + (2 / 3) * (intended.x - end.x));
    expect(cp2.y).toBeCloseTo(end.y + (2 / 3) * (intended.y - end.y));

    const control = bezierCurveControl(start, cp1, cp2, end);
    expect(control.x).toBeCloseTo(intended.x);
    expect(control.y).toBeCloseTo(intended.y);

    // Round-trip must be stable for drag edits.
    const again = cubicFromCurveControl(start, end, control);
    expect(again.cp1.x).toBeCloseTo(cp1.x);
    expect(again.cp1.y).toBeCloseTo(cp1.y);
    expect(again.cp2.x).toBeCloseTo(cp2.x);
    expect(again.cp2.y).toBeCloseTo(cp2.y);
  });

  it("finds shapes inside a marquee", () => {
    const a = rectShape({ id: "a" });
    const b = rectShape({
      id: "b",
      geometry: { kind: "rectangle", x: 200, y: 200, width: 20, height: 20 },
    });
    const hits = shapesInMarquee([a, b], { x: 0, y: 0, width: 80, height: 80 });
    expect(hits.map((s) => s.id)).toEqual(["a"]);
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

  it("produces open chevron arrowhead points", () => {
    const pts = arrowHeadPoints({ x: 0, y: 0 }, { x: 100, y: 0 }, 10);
    const nums = pts.split(/[\s,]+/).map(Number);
    expect(nums).toHaveLength(6);
    // Tip of the chevron is the middle point (at the arrow end).
    expect(nums[2]).toBe(100);
    expect(nums[3]).toBe(0);
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

  it("clamps translated geometry without changing shape identity", () => {
    const shape = rectShape({
      id: "edge",
      geometry: { kind: "rectangle", x: 790, y: -20, width: 40, height: 30 },
    });
    const clamped = constrainShapeToBoard(shape);
    const bounds = shapeVisualBounds(clamped);

    expect(clamped.id).toBe("edge");
    expect(bounds.x).toBeGreaterThanOrEqual(0);
    expect(bounds.y).toBeGreaterThanOrEqual(0);
    expect(bounds.x + bounds.width).toBeLessThanOrEqual(800);
    expect(bounds.y + bounds.height).toBeLessThanOrEqual(800);
  });

  it("keeps rotated visual bounds inside the board", () => {
    const rotated = rectShape({
      geometry: { kind: "rectangle", x: 0, y: 0, width: 500, height: 500 },
      transform: "rotate(45 250 250)",
    });
    const clamped = constrainShapeToBoard(rotated);
    const bounds = shapeVisualBounds(clamped);

    expect(clamped.transform).toContain("rotate(45");
    expect(bounds.x).toBeGreaterThanOrEqual(0);
    expect(bounds.y).toBeGreaterThanOrEqual(0);
    expect(bounds.x + bounds.width).toBeLessThanOrEqual(800);
    expect(bounds.y + bounds.height).toBeLessThanOrEqual(800);
  });

  it("accounts for arrowheads when clamping", () => {
    const arrow: WhiteboardShape = {
      ...rectShape(),
      id: "arrow",
      tool: "arrow",
      strokeWidth: 10,
      geometry: {
        kind: "arrow",
        start: { x: 760, y: 5 },
        end: { x: 799, y: 5 },
      },
    };
    const bounds = shapeVisualBounds(constrainShapeToBoard(arrow));

    expect(bounds.x).toBeGreaterThanOrEqual(0);
    expect(bounds.y).toBeGreaterThanOrEqual(0);
    expect(bounds.x + bounds.width).toBeLessThanOrEqual(800);
    expect(bounds.y + bounds.height).toBeLessThanOrEqual(800);
  });

  it("unions group bounds with larger selection pad", () => {
    const a = rectShape({ id: "a" });
    const b = rectShape({
      id: "b",
      geometry: { kind: "rectangle", x: 100, y: 80, width: 20, height: 10 },
    });
    expect(groupShapeBounds([a, b])).toEqual({
      x: 10,
      y: 20,
      width: 110,
      height: 70,
    });
    const sel = groupSelectionBounds([a, b]);
    expect(sel).not.toBeNull();
    expect(sel!.width).toBeGreaterThan(110);
    expect(sel!.height).toBeGreaterThan(70);
  });

  it("resizes from an edge handle", () => {
    const box = resizeRectFromHandle(
      { x: 10, y: 10, width: 40, height: 20 },
      "e",
      { x: 70, y: 15 },
      false,
    );
    expect(box).toEqual({ x: 10, y: 10, width: 60, height: 20 });
  });

  it("scales multiple shapes through a group box while preserving layout", () => {
    const a = rectShape({ id: "a" });
    const b = rectShape({
      id: "b",
      geometry: { kind: "rectangle", x: 60, y: 20, width: 20, height: 30 },
    });
    const oldGroup = groupShapeBounds([a, b])!;
    const newGroup = {
      x: oldGroup.x,
      y: oldGroup.y,
      width: oldGroup.width * 2,
      height: oldGroup.height * 2,
    };
    const scaled = scaleShapesToGroupBox([a, b], oldGroup, newGroup);
    expect(shapeBounds(scaled[0]!)).toEqual(
      mapBoxThroughGroup(shapeBounds(a), oldGroup, newGroup),
    );
    expect(shapeBounds(scaled[1]!)).toEqual(
      mapBoxThroughGroup(shapeBounds(b), oldGroup, newGroup),
    );
    expect(groupShapeBounds(scaled)).toEqual(newGroup);
  });

  it("clamps a single board point into the 800×800 square", () => {
    expect(clampPointToBoard({ x: -10, y: 900 })).toEqual({ x: 0, y: 800 });
    expect(clampPointToBoard({ x: 12, y: 34 }, undefined, 4)).toEqual({
      x: 12,
      y: 34,
    });
    expect(clampPointToBoard({ x: 1, y: 799 }, undefined, 4)).toEqual({
      x: 4,
      y: 796,
    });
  });

  it("point-mode constrain moves only out-of-board endpoints", () => {
    const curve: WhiteboardShape = {
      id: "c",
      tool: "bezier",
      stroke: "#000",
      fill: "none",
      strokeWidth: 4,
      transform: "",
      geometry: {
        kind: "bezier",
        start: { x: 100, y: 100 },
        end: { x: 850, y: 120 },
        cp1: { x: 200, y: 40 },
        cp2: { x: 700, y: 40 },
      },
      createdBy: "p1",
      createdAt: 1,
    };
    const clamped = constrainShapeToBoard(curve, undefined, { mode: "points" });
    expect(clamped.geometry.kind).toBe("bezier");
    if (clamped.geometry.kind !== "bezier") return;
    expect(clamped.geometry.start).toEqual({ x: 100, y: 100 });
    expect(clamped.geometry.cp1).toEqual({ x: 200, y: 40 });
    expect(clamped.geometry.cp2).toEqual({ x: 700, y: 40 });
    expect(clamped.geometry.end).toEqual({ x: 800, y: 120 });
  });

  it("does not warp thin arrow proportions when fitting near the rail", () => {
    const arrow: WhiteboardShape = {
      ...rectShape(),
      id: "arrow",
      tool: "arrow",
      strokeWidth: 8,
      geometry: {
        kind: "arrow",
        start: { x: 100, y: 400 },
        end: { x: 820, y: 400 },
      },
    };
    const beforeLen = dist(
      (arrow.geometry as { start: { x: number; y: number }; end: { x: number; y: number } })
        .start,
      (arrow.geometry as { start: { x: number; y: number }; end: { x: number; y: number } })
        .end,
    );
    const points = clampGeometryPointsToBoard(arrow);
    expect(points.geometry.kind).toBe("arrow");
    if (points.geometry.kind !== "arrow") return;
    expect(points.geometry.start).toEqual({ x: 100, y: 400 });
    expect(points.geometry.end.x).toBe(800);
    expect(points.geometry.end.y).toBe(400);

    const fitted = constrainShapeToBoard(points);
    expect(fitted.geometry.kind).toBe("arrow");
    if (fitted.geometry.kind !== "arrow") return;
    // Translation-only fit: chord direction stays horizontal, no non-uniform scale.
    expect(fitted.geometry.start.y).toBeCloseTo(fitted.geometry.end.y);
    const afterLen = dist(fitted.geometry.start, fitted.geometry.end);
    expect(afterLen).toBeLessThanOrEqual(beforeLen + 1e-6);
    const bounds = shapeVisualBounds(fitted);
    expect(bounds.x).toBeGreaterThanOrEqual(0);
    expect(bounds.x + bounds.width).toBeLessThanOrEqual(800);
  });

  it("bbox scale of a curve is explicit scaleShapeToBox, not fit clamp", () => {
    const curve: WhiteboardShape = {
      id: "c",
      tool: "bezier",
      stroke: "#000",
      fill: "none",
      strokeWidth: 2,
      transform: "",
      geometry: {
        kind: "bezier",
        start: { x: 100, y: 100 },
        end: { x: 300, y: 100 },
        cp1: { x: 150, y: 40 },
        cp2: { x: 250, y: 40 },
      },
      createdBy: "p1",
      createdAt: 1,
    };
    const oldBox = shapeBounds(curve);
    const newBox = { ...oldBox, width: oldBox.width * 2, height: oldBox.height };
    const scaled = scaleShapeToBox(curve, oldBox, newBox);
    expect(scaled.geometry.kind).toBe("bezier");
    if (scaled.geometry.kind !== "bezier") return;
    expect(scaled.geometry.end.x - scaled.geometry.start.x).toBeCloseTo(400);
    // Point-mode clamp must not further scale the free endpoint.
    const clamped = constrainShapeToBoard(scaled, undefined, { mode: "points" });
    expect(clamped.geometry).toEqual(scaled.geometry);
  });

  it("snaps coordinates to the default grid", () => {
    expect(GRID_SIZE).toBe(16);
    expect(snapCoord(0)).toBe(0);
    expect(snapCoord(7)).toBe(0);
    expect(snapCoord(8)).toBe(16);
    expect(snapCoord(23)).toBe(16);
    expect(snapCoord(24)).toBe(32); // 24/16 = 1.5 → rounds half up
    expect(snapCoord(25)).toBe(32);
    expect(snapPoint({ x: 10, y: 20 })).toEqual({ x: 16, y: 16 });
    expect(maybeSnapPoint({ x: 10, y: 20 }, false)).toEqual({ x: 10, y: 20 });
    expect(maybeSnapPoint({ x: 10, y: 20 }, true)).toEqual({ x: 16, y: 16 });
    expect(snapCoord(13, 10)).toBe(10);
  });

  it("magnetically snaps only within the threshold", () => {
    // Default half-grid threshold always snaps to nearest cell.
    expect(maybeSnapCoord(7, true)).toBe(0);
    expect(maybeSnapCoord(8, true)).toBe(16);
    // Tighter threshold: leave values farther than 4 board units.
    expect(maybeSnapCoord(7, true, 16, 4)).toBe(7);
    // x=3 → 0 (|3|≤4); y=27 stays (|32-27|=5 > 4).
    expect(maybeSnapPoint({ x: 3, y: 27 }, true, 16, 4)).toEqual({
      x: 0,
      y: 27,
    });
  });
});
