import { cloneShape, createId, translateShape } from "./geometry";
import { PASTE_OFFSET, type WhiteboardShape } from "./types";

/** Deep-clone a shape with a new id (geometry/color/transform/stroke/fill retained). */
export function cloneShapeForClipboard(
  shape: WhiteboardShape,
  createdBy: string,
): WhiteboardShape {
  const next = cloneShape(shape);
  next.id = createId(shape.tool);
  next.createdBy = createdBy;
  next.createdAt = Date.now();
  return next;
}

/** Paste clone with a slight offset so it doesn't sit on the original. */
export function pasteShapeFromClipboard(
  clipboard: WhiteboardShape,
  createdBy: string,
  offset = PASTE_OFFSET,
): WhiteboardShape {
  const cloned = cloneShapeForClipboard(clipboard, createdBy);
  return translateShape(cloned, offset.x, offset.y);
}

/** Swap adjacent shapes for z-order (array index = paint order; last = top). */
export function bringShapeForward(
  shapes: WhiteboardShape[],
  id: string,
): WhiteboardShape[] | null {
  const i = shapes.findIndex((s) => s.id === id);
  if (i < 0 || i >= shapes.length - 1) return null;
  const next = [...shapes];
  const tmp = next[i]!;
  next[i] = next[i + 1]!;
  next[i + 1] = tmp;
  return next;
}

export function sendShapeBackward(
  shapes: WhiteboardShape[],
  id: string,
): WhiteboardShape[] | null {
  const i = shapes.findIndex((s) => s.id === id);
  if (i <= 0) return null;
  const next = [...shapes];
  const tmp = next[i]!;
  next[i] = next[i - 1]!;
  next[i - 1] = tmp;
  return next;
}

export function canBringForward(shapes: WhiteboardShape[], id: string): boolean {
  const i = shapes.findIndex((s) => s.id === id);
  return i >= 0 && i < shapes.length - 1;
}

export function canSendBackward(shapes: WhiteboardShape[], id: string): boolean {
  const i = shapes.findIndex((s) => s.id === id);
  return i > 0;
}
