"use client";

import * as React from "react";
import { HistoryStack } from "./history";
import { throttle } from "./throttle";
import { cloneShapes, createId } from "./geometry";
import { exportShapes, importShapes } from "./serialize";
import type {
  HistoryOp,
  Point,
  StrokeWidth,
  WhiteboardShape,
  WhiteboardSyncCallbacks,
  WhiteboardTool,
} from "./types";
import { PRESET_COLORS, STROKE_WIDTHS } from "./types";

const SYNC_INTERVAL_MS = 33; // ~30fps

export interface UseWhiteboardOptions extends WhiteboardSyncCallbacks {
  playerId?: string;
  isDrawer?: boolean;
  initialShapes?: WhiteboardShape[];
  fillTolerance?: number;
}

export interface DraftBezier {
  start: Point;
  end: Point;
  cp1: Point;
  cp2: Point;
  /** Which handle is being dragged, if any. */
  activeHandle: "cp1" | "cp2" | "end" | null;
  /** True once initial drag finished — handles are editable. */
  editing: boolean;
}

export interface DraftStroke {
  tool: WhiteboardTool;
  points?: Point[];
  start?: Point;
  end?: Point;
  /** Normalized rect/ellipse preview fields. */
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  cx?: number;
  cy?: number;
  rx?: number;
  ry?: number;
  transform?: string;
  skewDeg?: number;
  rotateDeg?: number;
}

export interface WhiteboardController {
  shapes: WhiteboardShape[];
  tool: WhiteboardTool;
  setTool: (tool: WhiteboardTool) => void;
  color: string;
  setColor: (color: string) => void;
  strokeWidth: StrokeWidth;
  setStrokeWidth: (w: StrokeWidth) => void;
  fillTolerance: number;
  setFillTolerance: (n: number) => void;
  draft: DraftStroke | null;
  bezierDraft: DraftBezier | null;
  canUndo: boolean;
  canRedo: boolean;
  isDrawer: boolean;
  isFilling: boolean;
  undo: () => void;
  redo: () => void;
  clear: () => void;
  /** Replace local document (remote sync / round reset). Clears history. */
  loadShapes: (shapes: WhiteboardShape[]) => void;
  /** Apply a remote-created shape without pushing history. */
  applyRemoteShape: (shape: WhiteboardShape) => void;
  /** Remove by id without history (remote delete). */
  applyRemoteDelete: (shapeId: string) => void;
  applyRemoteClear: () => void;
  exportDocument: () => ReturnType<typeof exportShapes>;
  importDocument: (payload: unknown) => void;
  /** Imperative commit helpers used by the canvas. */
  commitShape: (shape: WhiteboardShape) => void;
  setDraft: React.Dispatch<React.SetStateAction<DraftStroke | null>>;
  setBezierDraft: React.Dispatch<React.SetStateAction<DraftBezier | null>>;
  commitBezierDraft: () => void;
  cancelBezierDraft: () => void;
  setIsFilling: (v: boolean) => void;
  playerId: string;
}

export function useWhiteboard(options: UseWhiteboardOptions = {}): WhiteboardController {
  const {
    playerId = "local",
    isDrawer = true,
    initialShapes = [],
    fillTolerance: initialTolerance = 32,
    onShapeCreated,
    onShapeUpdated,
    onShapeDeleted,
    onClear,
    onUndo,
    onRedo,
    onShapesChange,
  } = options;

  const [shapes, setShapes] = React.useState<WhiteboardShape[]>(() =>
    cloneShapes(initialShapes),
  );
  const [tool, setTool] = React.useState<WhiteboardTool>("bezier");
  const [color, setColor] = React.useState<string>(PRESET_COLORS[0]);
  const [strokeWidth, setStrokeWidth] = React.useState<StrokeWidth>(STROKE_WIDTHS[1]);
  const [fillTolerance, setFillTolerance] = React.useState(initialTolerance);
  const [draft, setDraft] = React.useState<DraftStroke | null>(null);
  const [bezierDraft, setBezierDraft] = React.useState<DraftBezier | null>(null);
  const [canUndo, setCanUndo] = React.useState(false);
  const [canRedo, setCanRedo] = React.useState(false);
  const [isFilling, setIsFilling] = React.useState(false);

  const historyRef = React.useRef(new HistoryStack());
  const shapesRef = React.useRef(shapes);
  shapesRef.current = shapes;

  const callbacksRef = React.useRef({
    onShapeCreated,
    onShapeUpdated,
    onShapeDeleted,
    onClear,
    onUndo,
    onRedo,
    onShapesChange,
  });
  callbacksRef.current = {
    onShapeCreated,
    onShapeUpdated,
    onShapeDeleted,
    onClear,
    onUndo,
    onRedo,
    onShapesChange,
  };

  const emitShapesChange = React.useMemo(
    () =>
      throttle((next: WhiteboardShape[]) => {
        callbacksRef.current.onShapesChange?.(next);
      }, SYNC_INTERVAL_MS),
    [],
  );

  React.useEffect(() => () => emitShapesChange.cancel(), [emitShapesChange]);

  const syncHistoryFlags = React.useCallback(() => {
    setCanUndo(historyRef.current.canUndo);
    setCanRedo(historyRef.current.canRedo);
  }, []);

  const replaceShapes = React.useCallback(
    (next: WhiteboardShape[], emit = true) => {
      setShapes(next);
      shapesRef.current = next;
      if (emit) emitShapesChange(next);
    },
    [emitShapesChange],
  );

  const commitShape = React.useCallback(
    (shape: WhiteboardShape) => {
      const op: HistoryOp = { type: "add", shape };
      historyRef.current.push(op);
      syncHistoryFlags();
      const next = [...shapesRef.current, shape];
      replaceShapes(next);
      callbacksRef.current.onShapeCreated?.(shape);
      emitShapesChange.flush();
    },
    [replaceShapes, syncHistoryFlags, emitShapesChange],
  );

  const undo = React.useCallback(() => {
    if (!isDrawer) return;
    const result = historyRef.current.undo(shapesRef.current);
    if (!result) return;
    syncHistoryFlags();
    replaceShapes(result.shapes);
    callbacksRef.current.onUndo?.(result.op);
    // Mirror inverse for sync consumers
    switch (result.op.type) {
      case "add":
        callbacksRef.current.onShapeDeleted?.(result.op.shape.id);
        break;
      case "remove":
        callbacksRef.current.onShapeCreated?.(result.op.shape);
        break;
      case "update":
        callbacksRef.current.onShapeUpdated?.(result.op.before);
        break;
      case "clear":
        // restored shapes — emit full snapshot
        break;
      case "replace":
        break;
    }
    emitShapesChange.flush();
  }, [isDrawer, replaceShapes, syncHistoryFlags, emitShapesChange]);

  const redo = React.useCallback(() => {
    if (!isDrawer) return;
    const result = historyRef.current.redo(shapesRef.current);
    if (!result) return;
    syncHistoryFlags();
    replaceShapes(result.shapes);
    callbacksRef.current.onRedo?.(result.op);
    switch (result.op.type) {
      case "add":
        callbacksRef.current.onShapeCreated?.(result.op.shape);
        break;
      case "remove":
        callbacksRef.current.onShapeDeleted?.(result.op.shape.id);
        break;
      case "update":
        callbacksRef.current.onShapeUpdated?.(result.op.after);
        break;
      case "clear":
        callbacksRef.current.onClear?.();
        break;
      case "replace":
        break;
    }
    emitShapesChange.flush();
  }, [isDrawer, replaceShapes, syncHistoryFlags, emitShapesChange]);

  const clear = React.useCallback(() => {
    if (!isDrawer) return;
    const prev = cloneShapes(shapesRef.current);
    if (prev.length === 0) return;
    historyRef.current.push({ type: "clear", shapes: prev });
    syncHistoryFlags();
    replaceShapes([]);
    callbacksRef.current.onClear?.();
    emitShapesChange.flush();
  }, [isDrawer, replaceShapes, syncHistoryFlags, emitShapesChange]);

  const loadShapes = React.useCallback(
    (next: WhiteboardShape[]) => {
      historyRef.current.clear();
      syncHistoryFlags();
      setDraft(null);
      setBezierDraft(null);
      replaceShapes(cloneShapes(next), true);
      emitShapesChange.flush();
    },
    [replaceShapes, syncHistoryFlags, emitShapesChange],
  );

  const applyRemoteShape = React.useCallback(
    (shape: WhiteboardShape) => {
      const without = shapesRef.current.filter((s) => s.id !== shape.id);
      replaceShapes([...without, shape]);
    },
    [replaceShapes],
  );

  const applyRemoteDelete = React.useCallback(
    (shapeId: string) => {
      replaceShapes(shapesRef.current.filter((s) => s.id !== shapeId));
    },
    [replaceShapes],
  );

  const applyRemoteClear = React.useCallback(() => {
    historyRef.current.clear();
    syncHistoryFlags();
    replaceShapes([]);
  }, [replaceShapes, syncHistoryFlags]);

  const exportDocument = React.useCallback(
    () => exportShapes(shapesRef.current),
    [],
  );

  const importDocument = React.useCallback(
    (payload: unknown) => {
      loadShapes(importShapes(payload));
    },
    [loadShapes],
  );

  const commitBezierDraft = React.useCallback(() => {
    const d = bezierDraft;
    if (!d) return;
    const shape: WhiteboardShape = {
      id: createId("bezier"),
      tool: "bezier",
      stroke: color,
      fill: "none",
      strokeWidth,
      transform: "",
      geometry: {
        kind: "bezier",
        start: d.start,
        end: d.end,
        cp1: d.cp1,
        cp2: d.cp2,
      },
      createdBy: playerId,
      createdAt: Date.now(),
    };
    setBezierDraft(null);
    commitShape(shape);
  }, [bezierDraft, color, strokeWidth, playerId, commitShape]);

  const cancelBezierDraft = React.useCallback(() => {
    setBezierDraft(null);
  }, []);

  // Keyboard shortcuts for drawer
  React.useEffect(() => {
    if (!isDrawer) return;
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if (mod && (e.key.toLowerCase() === "y" || (e.key.toLowerCase() === "z" && e.shiftKey))) {
        e.preventDefault();
        redo();
      } else if (e.key === "Enter" && bezierDraft) {
        e.preventDefault();
        commitBezierDraft();
      } else if (e.key === "Escape" && bezierDraft) {
        e.preventDefault();
        cancelBezierDraft();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isDrawer, undo, redo, bezierDraft, commitBezierDraft, cancelBezierDraft]);

  return {
    shapes,
    tool,
    setTool,
    color,
    setColor,
    strokeWidth,
    setStrokeWidth,
    fillTolerance,
    setFillTolerance,
    draft,
    bezierDraft,
    canUndo,
    canRedo,
    isDrawer,
    isFilling,
    undo,
    redo,
    clear,
    loadShapes,
    applyRemoteShape,
    applyRemoteDelete,
    applyRemoteClear,
    exportDocument,
    importDocument,
    commitShape,
    setDraft,
    setBezierDraft,
    commitBezierDraft,
    cancelBezierDraft,
    setIsFilling,
    playerId,
  };
}
