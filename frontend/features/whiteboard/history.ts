import type { HistoryOp, WhiteboardShape } from "./types";
import { cloneShape, cloneShapes } from "./geometry";

/**
 * Local undo/redo stack for the current round.
 * Each push clears the redo branch (standard editor semantics).
 */
export class HistoryStack {
  private undoStack: HistoryOp[] = [];
  private redoStack: HistoryOp[] = [];
  private readonly limit: number;

  constructor(limit = 100) {
    this.limit = limit;
  }

  get canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  get canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  get undoDepth(): number {
    return this.undoStack.length;
  }

  get redoDepth(): number {
    return this.redoStack.length;
  }

  clear(): void {
    this.undoStack = [];
    this.redoStack = [];
  }

  push(op: HistoryOp): void {
    this.undoStack.push(op);
    if (this.undoStack.length > this.limit) {
      this.undoStack.shift();
    }
    this.redoStack = [];
  }

  undo(shapes: WhiteboardShape[]): { shapes: WhiteboardShape[]; op: HistoryOp } | null {
    const op = this.undoStack.pop();
    if (!op) return null;
    const next = applyInverse(shapes, op);
    this.redoStack.push(op);
    return { shapes: next, op };
  }

  redo(shapes: WhiteboardShape[]): { shapes: WhiteboardShape[]; op: HistoryOp } | null {
    const op = this.redoStack.pop();
    if (!op) return null;
    const next = applyForward(shapes, op);
    this.undoStack.push(op);
    return { shapes: next, op };
  }
}

function applyForward(shapes: WhiteboardShape[], op: HistoryOp): WhiteboardShape[] {
  switch (op.type) {
    case "add":
      return [...shapes, cloneShape(op.shape)];
    case "remove":
      return shapes.filter((s) => s.id !== op.shape.id);
    case "update":
      return shapes.map((s) => (s.id === op.after.id ? cloneShape(op.after) : s));
    case "clear":
      return [];
    case "replace":
      return cloneShapes(op.after);
  }
}

function applyInverse(shapes: WhiteboardShape[], op: HistoryOp): WhiteboardShape[] {
  switch (op.type) {
    case "add":
      return shapes.filter((s) => s.id !== op.shape.id);
    case "remove": {
      const next = [...shapes];
      next.splice(Math.min(op.index, next.length), 0, cloneShape(op.shape));
      return next;
    }
    case "update":
      return shapes.map((s) => (s.id === op.before.id ? cloneShape(op.before) : s));
    case "clear":
      return cloneShapes(op.shapes);
    case "replace":
      return cloneShapes(op.before);
  }
}
