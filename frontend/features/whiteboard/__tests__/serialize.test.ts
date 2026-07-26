import { describe, expect, it } from "vitest";
import {
  coercePencilGeometry,
  exportShapes,
  importShapes,
  importShapesJson,
  mergeShapesById,
  normalizeShape,
} from "../serialize";
import type { WhiteboardShape } from "../types";

const sample: WhiteboardShape = {
  id: "s1",
  tool: "rectangle",
  stroke: "#2C2C2C",
  fill: "none",
  strokeWidth: 5,
  transform: "rotate(10 50 50)",
  geometry: { kind: "rectangle", x: 10, y: 20, width: 30, height: 40 },
  createdBy: "alice",
  createdAt: 1000,
};

describe("serialize", () => {
  it("round-trips export/import", () => {
    const doc = exportShapes([sample]);
    expect(doc.version).toBe(1);
    const shapes = importShapes(doc);
    expect(shapes).toEqual([sample]);
  });

  it("imports bare shape arrays", () => {
    expect(importShapes([sample])[0].id).toBe("s1");
  });

  it("rejects completely malformed payloads", () => {
    expect(() => importShapes({ shapes: [{ id: 1 }] })).toThrow();
    expect(() => importShapesJson("{}")).toThrow();
  });

  it("merges by id with last-write-wins", () => {
    const local = [sample];
    const remote: WhiteboardShape = {
      ...sample,
      stroke: "#EF4444",
      createdAt: 2000,
    };
    const merged = mergeShapesById(local, [remote]);
    expect(merged).toHaveLength(1);
    expect(merged[0].stroke).toBe("#EF4444");
  });

  it("coerces legacy pencil points into an SVG path d", () => {
    const coerced = coercePencilGeometry({
      kind: "pencil",
      points: [
        { x: 0, y: 0 },
        { x: 10, y: 5 },
        { x: 20, y: 0 },
      ],
    });
    expect(coerced).not.toBeNull();
    expect(coerced!.d.startsWith("M")).toBe(true);
  });

  it("normalizes a pencil wire shape with points", () => {
    const shape = normalizeShape({
      id: "p1",
      tool: "pencil",
      stroke: "#000",
      fill: "none",
      strokeWidth: 4,
      transform: "",
      geometry: {
        kind: "pencil",
        points: [
          { x: 1, y: 2 },
          { x: 3, y: 4 },
        ],
      },
      createdBy: "u1",
      createdAt: 1,
    });
    expect(shape).not.toBeNull();
    expect(shape!.geometry.kind).toBe("pencil");
    if (shape!.geometry.kind === "pencil") {
      expect(shape!.geometry.d.startsWith("M")).toBe(true);
    }
  });

  it("keeps valid shapes when one pencil entry is corrupt", () => {
    const shapes = importShapes([
      sample,
      {
        id: "bad",
        tool: "pencil",
        stroke: "#000",
        fill: "none",
        strokeWidth: 2,
        transform: "",
        geometry: { kind: "pencil" },
        createdBy: "u",
        createdAt: 1,
      },
    ]);
    expect(shapes).toHaveLength(1);
    expect(shapes[0].id).toBe("s1");
  });
});
