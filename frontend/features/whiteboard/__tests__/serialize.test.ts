import { describe, expect, it } from "vitest";
import {
  exportShapes,
  importShapes,
  importShapesJson,
  mergeShapesById,
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

  it("rejects malformed payloads", () => {
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
});
