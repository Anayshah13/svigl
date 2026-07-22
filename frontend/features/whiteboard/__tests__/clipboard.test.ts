import { describe, expect, it } from "vitest";
import {
  bringShapeForward,
  canBringForward,
  canSendBackward,
  cloneShapeForClipboard,
  pasteShapeFromClipboard,
  sendShapeBackward,
} from "../clipboard";
import { PASTE_OFFSET, type WhiteboardShape } from "../types";

function rect(id: string, x = 0, y = 0): WhiteboardShape {
  return {
    id,
    tool: "rectangle",
    stroke: "#ED7FB8",
    fill: "none",
    strokeWidth: 5,
    transform: "rotate(10 5 5)",
    geometry: { kind: "rectangle", x, y, width: 40, height: 20 },
    createdBy: "p1",
    createdAt: 1,
  };
}

describe("clipboard helpers", () => {
  it("clones with a new id and retains style/geometry/transform", () => {
    const src = rect("a", 10, 20);
    const cloned = cloneShapeForClipboard(src, "p2");
    expect(cloned.id).not.toBe(src.id);
    expect(cloned.stroke).toBe(src.stroke);
    expect(cloned.strokeWidth).toBe(src.strokeWidth);
    expect(cloned.fill).toBe(src.fill);
    expect(cloned.transform).toBe(src.transform);
    expect(cloned.geometry).toEqual(src.geometry);
    expect(cloned.createdBy).toBe("p2");
  });

  it("pastes with a slight offset", () => {
    const src = rect("a", 10, 20);
    const pasted = pasteShapeFromClipboard(src, "p2");
    expect(pasted.geometry.kind).toBe("rectangle");
    if (pasted.geometry.kind !== "rectangle") return;
    expect(pasted.geometry.x).toBe(10 + PASTE_OFFSET.x);
    expect(pasted.geometry.y).toBe(20 + PASTE_OFFSET.y);
    // rotate origin should shift with offsetTransform
    expect(pasted.transform).toContain("rotate(10");
  });

  it("bring forward / send backward reorders paint order", () => {
    const shapes = [rect("a"), rect("b"), rect("c")];
    expect(canBringForward(shapes, "a")).toBe(true);
    expect(canBringForward(shapes, "c")).toBe(false);
    expect(canSendBackward(shapes, "a")).toBe(false);
    expect(canSendBackward(shapes, "c")).toBe(true);

    const fwd = bringShapeForward(shapes, "a");
    expect(fwd?.map((s) => s.id)).toEqual(["b", "a", "c"]);

    const back = sendShapeBackward(shapes, "c");
    expect(back?.map((s) => s.id)).toEqual(["a", "c", "b"]);

    expect(bringShapeForward(shapes, "c")).toBeNull();
    expect(sendShapeBackward(shapes, "a")).toBeNull();
  });
});
