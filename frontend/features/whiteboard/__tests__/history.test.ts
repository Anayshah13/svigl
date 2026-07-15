import { describe, expect, it } from "vitest";
import { HistoryStack } from "../history";
import type { WhiteboardShape } from "../types";

function shape(id: string): WhiteboardShape {
  return {
    id,
    tool: "rectangle",
    stroke: "#000",
    fill: "none",
    strokeWidth: 2,
    transform: "",
    geometry: { kind: "rectangle", x: 0, y: 0, width: 10, height: 10 },
    createdBy: "p1",
    createdAt: 1,
  };
}

describe("HistoryStack", () => {
  it("undoes and redoes add", () => {
    const h = new HistoryStack();
    let shapes: WhiteboardShape[] = [];
    const a = shape("a");
    h.push({ type: "add", shape: a });
    shapes = [...shapes, a];

    const undone = h.undo(shapes);
    expect(undone?.shapes).toEqual([]);
    expect(h.canRedo).toBe(true);

    const redone = h.redo([]);
    expect(redone?.shapes).toHaveLength(1);
    expect(redone?.shapes[0].id).toBe("a");
  });

  it("restores cleared shapes on undo", () => {
    const h = new HistoryStack();
    const prev = [shape("a"), shape("b")];
    h.push({ type: "clear", shapes: prev });
    const undone = h.undo([]);
    expect(undone?.shapes.map((s) => s.id)).toEqual(["a", "b"]);
  });

  it("clears redo branch on new push", () => {
    const h = new HistoryStack();
    h.push({ type: "add", shape: shape("a") });
    h.undo([shape("a")]);
    expect(h.canRedo).toBe(true);
    h.push({ type: "add", shape: shape("b") });
    expect(h.canRedo).toBe(false);
  });

  it("re-inserts removed shape at index", () => {
    const h = new HistoryStack();
    const a = shape("a");
    const b = shape("b");
    h.push({ type: "remove", shape: b, index: 1 });
    const undone = h.undo([a]);
    expect(undone?.shapes.map((s) => s.id)).toEqual(["a", "b"]);
  });

  it("undoes shape update", () => {
    const h = new HistoryStack();
    const before = shape("a");
    const after = {
      ...before,
      geometry: { kind: "rectangle" as const, x: 5, y: 5, width: 20, height: 20 },
    };
    h.push({ type: "update", before, after });
    const undone = h.undo([after]);
    expect(undone?.shapes[0].geometry).toEqual(before.geometry);
    const redone = h.redo(undone!.shapes);
    expect(redone?.shapes[0].geometry).toEqual(after.geometry);
  });
});
