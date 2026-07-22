"use client";

import * as React from "react";
import {
  bringShapeForward,
  canBringForward,
  canSendBackward,
  pasteShapeFromClipboard,
  sendShapeBackward,
} from "./clipboard";
import { HistoryStack } from "./history";
import { throttle } from "./throttle";
import { cloneShape, cloneShapes, createId, translateShape } from "./geometry";
import { exportShapes, importShapes } from "./serialize";
import { isEditableTarget, TOOL_SHORTCUT_MAP } from "./toolMeta";
import type {
  DrawingTool,
  HistoryOp,
  Point,
  StrokeWidth,
  WhiteboardShape,
  WhiteboardSyncCallbacks,
  WhiteboardTool,
} from "./types";
import { NUDGE_LARGE, NUDGE_SMALL, PRESET_COLORS, STROKE_WIDTHS } from "./types";

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
  tool: DrawingTool;
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
  /** Currently selected shape id (drawer only). */
  selectedId: string | null;
  selectShape: (id: string | null) => void;
  canUndo: boolean;
  canRedo: boolean;
  canPaste: boolean;
  canCopy: boolean;
  canDelete: boolean;
  canDuplicate: boolean;
  canBringForward: boolean;
  canSendBackward: boolean;
  isDrawer: boolean;
  isFilling: boolean;
  undo: () => void;
  redo: () => void;
  clear: () => void;
  deleteSelected: () => void;
  copySelected: () => void;
  pasteClipboard: () => void;
  duplicateSelected: () => void;
  bringForward: () => void;
  sendBackward: () => void;
  nudgeSelected: (dx: number, dy: number) => void;
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
  /**
   * Live-update a shape during drag (syncs via onShapeUpdated, no history yet).
   * Pass the pre-edit snapshot once at pointer-down via `beginUpdate`.
   */
  previewShapeUpdate: (shape: WhiteboardShape) => void;
  /** Begin an edit session — stores `before` for history on commit. */
  beginShapeUpdate: (before: WhiteboardShape) => void;
  /** Finish edit: push history once + flush sync. */
  commitShapeUpdate: () => void;
  /** Cancel in-progress edit and restore `before`. */
  cancelShapeUpdate: () => void;
  setDraft: React.Dispatch<React.SetStateAction<DraftStroke | null>>;
  setBezierDraft: React.Dispatch<React.SetStateAction<DraftBezier | null>>;
  commitBezierDraft: () => void;
  cancelBezierDraft: () => void;
  setIsFilling: (v: boolean) => void;
  playerId: string;
  /** Announce ephemeral status for screen readers / toast strip. */
  statusMessage: string | null;
  clearStatus: () => void;
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
  const [tool, setToolState] = React.useState<WhiteboardTool>("bezier");
  const [color, setColorState] = React.useState<string>(PRESET_COLORS[0]);
  const [strokeWidth, setStrokeWidthState] = React.useState<StrokeWidth>(STROKE_WIDTHS[1]);
  const [fillTolerance, setFillTolerance] = React.useState(initialTolerance);
  const [draft, setDraft] = React.useState<DraftStroke | null>(null);
  const [bezierDraft, setBezierDraft] = React.useState<DraftBezier | null>(null);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [canUndo, setCanUndo] = React.useState(false);
  const [canRedo, setCanRedo] = React.useState(false);
  const [isFilling, setIsFilling] = React.useState(false);
  const [clipboardVersion, setClipboardVersion] = React.useState(0);
  const [statusMessage, setStatusMessage] = React.useState<string | null>(null);

  const historyRef = React.useRef(new HistoryStack());
  const shapesRef = React.useRef(shapes);
  shapesRef.current = shapes;
  const editBeforeRef = React.useRef<WhiteboardShape | null>(null);
  const clipboardRef = React.useRef<WhiteboardShape | null>(null);
  const statusTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const announce = React.useCallback((msg: string) => {
    setStatusMessage(msg);
    if (statusTimerRef.current) clearTimeout(statusTimerRef.current);
    statusTimerRef.current = setTimeout(() => setStatusMessage(null), 2200);
  }, []);

  const clearStatus = React.useCallback(() => setStatusMessage(null), []);

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

  const emitShapeUpdated = React.useMemo(
    () =>
      throttle((shape: WhiteboardShape) => {
        callbacksRef.current.onShapeUpdated?.(shape);
      }, SYNC_INTERVAL_MS),
    [],
  );

  React.useEffect(
    () => () => {
      emitShapesChange.cancel();
      emitShapeUpdated.cancel();
      if (statusTimerRef.current) clearTimeout(statusTimerRef.current);
    },
    [emitShapesChange, emitShapeUpdated],
  );

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

  const selectShape = React.useCallback(
    (id: string | null) => {
      if (!isDrawer) {
        setSelectedId(null);
        return;
      }
      setSelectedId(id);
    },
    [isDrawer],
  );

  const applyStyleToSelected = React.useCallback(
    (patch: Partial<Pick<WhiteboardShape, "stroke" | "strokeWidth" | "fill">>) => {
      if (!isDrawer || !selectedId) return;
      const before = shapesRef.current.find((s) => s.id === selectedId);
      if (!before) return;
      const after: WhiteboardShape = {
        ...before,
        ...patch,
        ...(before.geometry.kind === "fill" && patch.stroke
          ? { fill: patch.stroke, stroke: patch.stroke }
          : {}),
      };
      if (
        after.stroke === before.stroke &&
        after.strokeWidth === before.strokeWidth &&
        after.fill === before.fill
      ) {
        return;
      }
      historyRef.current.push({ type: "update", before: cloneShape(before), after: cloneShape(after) });
      syncHistoryFlags();
      const next = shapesRef.current.map((s) => (s.id === after.id ? after : s));
      replaceShapes(next);
      callbacksRef.current.onShapeUpdated?.(after);
      emitShapesChange.flush();
    },
    [isDrawer, selectedId, replaceShapes, syncHistoryFlags, emitShapesChange],
  );

  const setColor = React.useCallback(
    (c: string) => {
      setColorState(c);
      applyStyleToSelected({ stroke: c });
    },
    [applyStyleToSelected],
  );

  const setStrokeWidth = React.useCallback(
    (w: StrokeWidth) => {
      setStrokeWidthState(w);
      applyStyleToSelected({ strokeWidth: w });
    },
    [applyStyleToSelected],
  );

  const setTool = React.useCallback((t: WhiteboardTool) => {
    setToolState(t);
    setBezierDraft(null);
    setDraft(null);
    // Drawing tools clear selection so the next pointer starts a stroke.
    if (t !== "select") {
      setSelectedId(null);
    }
  }, []);

  const commitShape = React.useCallback(
    (shape: WhiteboardShape) => {
      const op: HistoryOp = { type: "add", shape };
      historyRef.current.push(op);
      syncHistoryFlags();
      const next = [...shapesRef.current, shape];
      replaceShapes(next);
      setSelectedId(null);
      callbacksRef.current.onShapeCreated?.(shape);
      emitShapesChange.flush();
    },
    [replaceShapes, syncHistoryFlags, emitShapesChange],
  );

  const beginShapeUpdate = React.useCallback((before: WhiteboardShape) => {
    editBeforeRef.current = cloneShape(before);
  }, []);

  const previewShapeUpdate = React.useCallback(
    (shape: WhiteboardShape) => {
      const next = shapesRef.current.map((s) => (s.id === shape.id ? shape : s));
      replaceShapes(next, false);
      emitShapeUpdated(shape);
    },
    [replaceShapes, emitShapeUpdated],
  );

  const commitShapeUpdate = React.useCallback(() => {
    const before = editBeforeRef.current;
    editBeforeRef.current = null;
    if (!before) {
      emitShapeUpdated.flush();
      emitShapesChange.flush();
      return;
    }
    const after = shapesRef.current.find((s) => s.id === before.id);
    if (!after) {
      emitShapeUpdated.flush();
      emitShapesChange.flush();
      return;
    }
    if (JSON.stringify(before) === JSON.stringify(after)) {
      emitShapeUpdated.cancel();
      return;
    }
    historyRef.current.push({
      type: "update",
      before: cloneShape(before),
      after: cloneShape(after),
    });
    syncHistoryFlags();
    emitShapeUpdated.flush();
    emitShapesChange.flush();
  }, [syncHistoryFlags, emitShapeUpdated, emitShapesChange]);

  const cancelShapeUpdate = React.useCallback(() => {
    const before = editBeforeRef.current;
    editBeforeRef.current = null;
    emitShapeUpdated.cancel();
    if (!before) return;
    const next = shapesRef.current.map((s) => (s.id === before.id ? before : s));
    replaceShapes(next);
    callbacksRef.current.onShapeUpdated?.(before);
    emitShapesChange.flush();
  }, [replaceShapes, emitShapeUpdated, emitShapesChange]);

  const deleteSelected = React.useCallback(() => {
    if (!isDrawer || !selectedId) return;
    const index = shapesRef.current.findIndex((s) => s.id === selectedId);
    if (index < 0) return;
    const shape = shapesRef.current[index]!;
    historyRef.current.push({
      type: "remove",
      shape: cloneShape(shape),
      index,
    });
    syncHistoryFlags();
    const next = shapesRef.current.filter((s) => s.id !== selectedId);
    replaceShapes(next);
    setSelectedId(null);
    callbacksRef.current.onShapeDeleted?.(shape.id);
    emitShapesChange.flush();
    announce("Shape deleted");
  }, [isDrawer, selectedId, replaceShapes, syncHistoryFlags, emitShapesChange, announce]);

  const copySelected = React.useCallback(() => {
    if (!isDrawer || !selectedId) return;
    const shape = shapesRef.current.find((s) => s.id === selectedId);
    if (!shape) return;
    clipboardRef.current = cloneShape(shape);
    setClipboardVersion((v) => v + 1);
    announce("Copied");
  }, [isDrawer, selectedId, announce]);

  const pasteClipboard = React.useCallback(() => {
    if (!isDrawer || !clipboardRef.current) return;
    const pasted = pasteShapeFromClipboard(clipboardRef.current, playerId);
    // Keep clipboard as the pre-offset original so repeated paste stacks offsets
    // from the original; re-copy the pasted result for natural multi-paste cascade.
    clipboardRef.current = cloneShape(pasted);
    setClipboardVersion((v) => v + 1);
    commitShape(pasted);
    setSelectedId(pasted.id);
    setToolState("select");
    announce("Pasted");
  }, [isDrawer, playerId, commitShape, announce]);

  const duplicateSelected = React.useCallback(() => {
    if (!isDrawer || !selectedId) return;
    const shape = shapesRef.current.find((s) => s.id === selectedId);
    if (!shape) return;
    clipboardRef.current = cloneShape(shape);
    setClipboardVersion((v) => v + 1);
    const dup = pasteShapeFromClipboard(shape, playerId);
    commitShape(dup);
    setSelectedId(dup.id);
    setToolState("select");
    announce("Duplicated");
  }, [isDrawer, selectedId, playerId, commitShape, announce]);

  const applyReorder = React.useCallback(
    (next: WhiteboardShape[] | null, label: string) => {
      if (!next) return;
      const before = cloneShapes(shapesRef.current);
      historyRef.current.push({ type: "replace", before, after: cloneShapes(next) });
      syncHistoryFlags();
      replaceShapes(next);
      // Sync each reordered shape so remotes see z-order via snapshot-ish updates.
      for (const s of next) {
        callbacksRef.current.onShapeUpdated?.(s);
      }
      emitShapesChange.flush();
      announce(label);
    },
    [replaceShapes, syncHistoryFlags, emitShapesChange, announce],
  );

  const bringForward = React.useCallback(() => {
    if (!isDrawer || !selectedId) return;
    applyReorder(bringShapeForward(shapesRef.current, selectedId), "Brought forward");
  }, [isDrawer, selectedId, applyReorder]);

  const sendBackward = React.useCallback(() => {
    if (!isDrawer || !selectedId) return;
    applyReorder(sendShapeBackward(shapesRef.current, selectedId), "Sent backward");
  }, [isDrawer, selectedId, applyReorder]);

  const nudgeSelected = React.useCallback(
    (dx: number, dy: number) => {
      if (!isDrawer || !selectedId || (!dx && !dy)) return;
      const before = shapesRef.current.find((s) => s.id === selectedId);
      if (!before) return;
      const after = translateShape(before, dx, dy);
      historyRef.current.push({
        type: "update",
        before: cloneShape(before),
        after: cloneShape(after),
      });
      syncHistoryFlags();
      const next = shapesRef.current.map((s) => (s.id === after.id ? after : s));
      replaceShapes(next);
      callbacksRef.current.onShapeUpdated?.(after);
      emitShapesChange.flush();
    },
    [isDrawer, selectedId, replaceShapes, syncHistoryFlags, emitShapesChange],
  );

  const undo = React.useCallback(() => {
    if (!isDrawer) return;
    const result = historyRef.current.undo(shapesRef.current);
    if (!result) return;
    syncHistoryFlags();
    replaceShapes(result.shapes);
    setSelectedId(null);
    // Server owns the undo stack — do NOT also emit SHAPE_DELETED/CREATED
    // (that double-applied ops and corrupted remote history).
    callbacksRef.current.onUndo?.(result.op);
    emitShapesChange.flush();
    announce("Undone");
  }, [isDrawer, replaceShapes, syncHistoryFlags, emitShapesChange, announce]);

  const redo = React.useCallback(() => {
    if (!isDrawer) return;
    const result = historyRef.current.redo(shapesRef.current);
    if (!result) return;
    syncHistoryFlags();
    replaceShapes(result.shapes);
    setSelectedId(null);
    callbacksRef.current.onRedo?.(result.op);
    emitShapesChange.flush();
    announce("Redone");
  }, [isDrawer, replaceShapes, syncHistoryFlags, emitShapesChange, announce]);

  const clear = React.useCallback(() => {
    if (!isDrawer) return;
    const prev = cloneShapes(shapesRef.current);
    if (prev.length === 0) return;
    historyRef.current.push({ type: "clear", shapes: prev });
    syncHistoryFlags();
    setSelectedId(null);
    replaceShapes([]);
    callbacksRef.current.onClear?.();
    emitShapesChange.flush();
    announce("Board cleared");
  }, [isDrawer, replaceShapes, syncHistoryFlags, emitShapesChange, announce]);

  const loadShapes = React.useCallback(
    (next: WhiteboardShape[]) => {
      historyRef.current.clear();
      syncHistoryFlags();
      setDraft(null);
      setBezierDraft(null);
      setSelectedId(null);
      editBeforeRef.current = null;
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
      if (selectedId === shapeId) setSelectedId(null);
      replaceShapes(shapesRef.current.filter((s) => s.id !== shapeId));
    },
    [replaceShapes, selectedId],
  );

  const applyRemoteClear = React.useCallback(() => {
    historyRef.current.clear();
    syncHistoryFlags();
    setSelectedId(null);
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
    announce("Curve committed");
  }, [bezierDraft, color, strokeWidth, playerId, commitShape, announce]);

  const cancelBezierDraft = React.useCallback(() => {
    setBezierDraft(null);
    announce("Curve cancelled");
  }, [announce]);

  // Keyboard shortcuts for drawer
  React.useEffect(() => {
    if (!isDrawer) return;
    const onKey = (e: KeyboardEvent) => {
      if (isEditableTarget(e.target)) return;

      const mod = e.metaKey || e.ctrlKey;
      const key = e.key.toLowerCase();

      if (mod && key === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
        return;
      }
      if (mod && (key === "y" || (key === "z" && e.shiftKey))) {
        e.preventDefault();
        redo();
        return;
      }
      if (mod && key === "c") {
        e.preventDefault();
        copySelected();
        return;
      }
      if (mod && key === "v") {
        e.preventDefault();
        pasteClipboard();
        return;
      }
      if (mod && key === "d") {
        e.preventDefault();
        duplicateSelected();
        return;
      }
      if (e.key === "Delete" || e.key === "Backspace") {
        if (selectedId) {
          e.preventDefault();
          deleteSelected();
        }
        return;
      }
      if (e.key === "Enter" && bezierDraft) {
        e.preventDefault();
        commitBezierDraft();
        return;
      }
      if (e.key === "Escape") {
        if (bezierDraft) {
          e.preventDefault();
          cancelBezierDraft();
        } else if (selectedId) {
          e.preventDefault();
          setSelectedId(null);
          announce("Deselected");
        }
        return;
      }

      // Arrow-key nudge
      if (
        selectedId &&
        (e.key === "ArrowUp" ||
          e.key === "ArrowDown" ||
          e.key === "ArrowLeft" ||
          e.key === "ArrowRight")
      ) {
        e.preventDefault();
        const step = e.shiftKey ? NUDGE_LARGE : NUDGE_SMALL;
        const dx =
          e.key === "ArrowLeft" ? -step : e.key === "ArrowRight" ? step : 0;
        const dy =
          e.key === "ArrowUp" ? -step : e.key === "ArrowDown" ? step : 0;
        nudgeSelected(dx, dy);
        return;
      }

      // Tool shortcuts (no modifiers)
      if (!mod && !e.altKey && key.length === 1) {
        const nextTool = TOOL_SHORTCUT_MAP[key];
        if (nextTool) {
          e.preventDefault();
          setTool(nextTool);
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [
    isDrawer,
    undo,
    redo,
    bezierDraft,
    commitBezierDraft,
    cancelBezierDraft,
    selectedId,
    copySelected,
    pasteClipboard,
    duplicateSelected,
    deleteSelected,
    nudgeSelected,
    setTool,
    announce,
  ]);

  // Clear selection when drawer privilege is revoked
  React.useEffect(() => {
    if (!isDrawer) setSelectedId(null);
  }, [isDrawer]);

  // clipboardVersion forces canPaste recompute when clipboard changes
  void clipboardVersion;

  const canPaste = isDrawer && clipboardRef.current != null;
  const canCopy = isDrawer && selectedId != null;
  const canDelete = canCopy;
  const canDuplicate = canCopy;
  const canBringFwd =
    isDrawer && selectedId != null && canBringForward(shapes, selectedId);
  const canSendBack =
    isDrawer && selectedId != null && canSendBackward(shapes, selectedId);

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
    selectedId,
    selectShape,
    canUndo,
    canRedo,
    canPaste,
    canCopy,
    canDelete,
    canDuplicate,
    canBringForward: canBringFwd,
    canSendBackward: canSendBack,
    isDrawer,
    isFilling,
    undo,
    redo,
    clear,
    deleteSelected,
    copySelected,
    pasteClipboard,
    duplicateSelected,
    bringForward,
    sendBackward,
    nudgeSelected,
    loadShapes,
    applyRemoteShape,
    applyRemoteDelete,
    applyRemoteClear,
    exportDocument,
    importDocument,
    commitShape,
    previewShapeUpdate,
    beginShapeUpdate,
    commitShapeUpdate,
    cancelShapeUpdate,
    setDraft,
    setBezierDraft,
    commitBezierDraft,
    cancelBezierDraft,
    setIsFilling,
    playerId,
    statusMessage,
    clearStatus,
  };
}
