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
import {
  cloneShape,
  cloneShapes,
  constrainShapeToBoard,
  translateShape,
  type ConstrainMode,
} from "./geometry";
import { exportShapes, importShapes } from "./serialize";
import { isEditableTarget, TOOL_SHORTCUT_MAP } from "./toolMeta";
import type {
  ColorTarget,
  DrawingTool,
  HistoryOp,
  Point,
  StrokeWidth,
  WhiteboardShape,
  WhiteboardSyncCallbacks,
  WhiteboardTool,
} from "./types";
import {
  GRID_SIZE,
  NUDGE_LARGE,
  NUDGE_SMALL,
  PRESET_COLORS,
  STROKE_WIDTHS,
} from "./types";

const SYNC_INTERVAL_MS = 33; // ~30fps

export interface UseWhiteboardOptions extends WhiteboardSyncCallbacks {
  playerId?: string;
  isDrawer?: boolean;
  initialShapes?: WhiteboardShape[];
  fillTolerance?: number;
  /**
   * Sketch mode: bezier commits on pointer-up without an Escape/Enter step.
   * Click still selects committed shapes; drag always starts a new stroke.
   * Used by `/demo` while iterating on game UX.
   */
  preferDraw?: boolean;
}

export interface DraftBezier {
  id: string;
  createdAt: number;
  start: Point;
  end: Point;
  cp1: Point;
  cp2: Point;
  /** Which handle is being dragged, if any. */
  activeHandle: "control" | "end" | null;
  /** True once initial drag finished — handles are editable. */
  editing: boolean;
}

export interface DraftStroke {
  id: string;
  createdAt: number;
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
  /** @deprecated Prefer `strokeColor` — kept as stroke alias. */
  color: string;
  /** @deprecated Prefer `setStrokeColor`. */
  setColor: (color: string) => void;
  strokeColor: string;
  setStrokeColor: (color: string) => void;
  fillColor: string | "none";
  setFillColor: (color: string | "none") => void;
  colorTarget: ColorTarget;
  setColorTarget: (target: ColorTarget) => void;
  /** Apply palette pick to the active stroke/fill slot. */
  applyPaletteColor: (color: string) => void;
  strokeWidth: StrokeWidth;
  setStrokeWidth: (w: StrokeWidth) => void;
  fillTolerance: number;
  setFillTolerance: (n: number) => void;
  snapToGrid: boolean;
  setSnapToGrid: (enabled: boolean) => void;
  gridSize: number;
  draft: DraftStroke | null;
  bezierDraft: DraftBezier | null;
  /** Primary selected shape id (last in selection; drawer only). */
  selectedId: string | null;
  /** All selected shape ids (marquee / multi-select). */
  selectedIds: string[];
  selectShape: (id: string | null) => void;
  selectShapes: (ids: string[]) => void;
  canUndo: boolean;
  canRedo: boolean;
  canPaste: boolean;
  canCopy: boolean;
  canDelete: boolean;
  canClear: boolean;
  canDuplicate: boolean;
  canBringForward: boolean;
  canSendBackward: boolean;
  isDrawer: boolean;
  isFilling: boolean;
  /** When true, drawing tools prioritize new strokes over selection. */
  preferDraw: boolean;
  undo: () => void;
  redo: () => void;
  clear: () => void;
  deleteSelected: () => void;
  /** Delete a shape by id (eraser / sync). */
  deleteShapeById: (shapeId: string) => void;
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
  /** Publish an in-progress creation without adding it to local history. */
  previewShapeCreation: (shape: WhiteboardShape) => void;
  /** Remove an abandoned in-progress creation from remote clients. */
  cancelShapeCreationPreview: (shapeId: string) => void;
  /**
   * Live-update a shape during drag (syncs via onShapeUpdated, no history yet).
   * Pass the pre-edit snapshot once at pointer-down via `beginUpdate`.
   */
  previewShapeUpdate: (
    shape: WhiteboardShape,
    opts?: { constrain?: ConstrainMode | false },
  ) => void;
  /** Live-update several shapes during a multi-select drag. */
  previewShapesPatch: (shapes: WhiteboardShape[]) => void;
  /** Begin an edit session — stores `before` for history on commit. */
  beginShapeUpdate: (before: WhiteboardShape) => void;
  /** Begin a multi-shape edit (stores full document snapshot). */
  beginMultiShapeUpdate: () => void;
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
    preferDraw = false,
    onShapeCreated,
    onShapePreview,
    onShapePreviewCancelled,
    onShapeUpdated,
    onShapeDeleted,
    onClear,
    onUndo,
    onRedo,
    onShapesChange,
  } = options;

  const [shapes, setShapes] = React.useState<WhiteboardShape[]>(() =>
    cloneShapes(initialShapes).map((shape) => constrainShapeToBoard(shape)),
  );
  const [tool, setToolState] = React.useState<WhiteboardTool>("bezier");
  const [strokeColor, setStrokeColorState] = React.useState<string>(
    preferDraw ? "#000000" : PRESET_COLORS[0],
  );
  const [fillColor, setFillColorState] = React.useState<string | "none">("none");
  const [colorTarget, setColorTarget] = React.useState<ColorTarget>("stroke");
  const [strokeWidth, setStrokeWidthState] = React.useState<StrokeWidth>(STROKE_WIDTHS[1]);
  const [fillTolerance, setFillTolerance] = React.useState(initialTolerance);
  const [snapToGrid, setSnapToGrid] = React.useState(false);
  const [draft, setDraft] = React.useState<DraftStroke | null>(null);
  const [bezierDraft, setBezierDraft] = React.useState<DraftBezier | null>(null);
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);
  const selectedId = selectedIds.length ? selectedIds[selectedIds.length - 1]! : null;
  const [canUndo, setCanUndo] = React.useState(false);
  const [canRedo, setCanRedo] = React.useState(false);
  const [isFilling, setIsFilling] = React.useState(false);
  const [clipboardVersion, setClipboardVersion] = React.useState(0);
  const [statusMessage, setStatusMessage] = React.useState<string | null>(null);

  const historyRef = React.useRef(new HistoryStack());
  const shapesRef = React.useRef(shapes);
  shapesRef.current = shapes;
  const editBeforeRef = React.useRef<WhiteboardShape | null>(null);
  /** Full-document snapshot for multi-shape edits (marquee move). */
  const editSnapshotRef = React.useRef<WhiteboardShape[] | null>(null);
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
    onShapePreview,
    onShapePreviewCancelled,
    onShapeUpdated,
    onShapeDeleted,
    onClear,
    onUndo,
    onRedo,
    onShapesChange,
  });
  callbacksRef.current = {
    onShapeCreated,
    onShapePreview,
    onShapePreviewCancelled,
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

  React.useEffect(
    () => () => {
      emitShapesChange.cancel();
      if (statusTimerRef.current) clearTimeout(statusTimerRef.current);
    },
    [emitShapesChange],
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
        setSelectedIds([]);
        return;
      }
      setSelectedIds(id ? [id] : []);
    },
    [isDrawer],
  );

  const selectShapes = React.useCallback(
    (ids: string[]) => {
      if (!isDrawer) {
        setSelectedIds([]);
        return;
      }
      setSelectedIds(ids);
    },
    [isDrawer],
  );

  const applyStyleToSelected = React.useCallback(
    (patch: Partial<Pick<WhiteboardShape, "stroke" | "strokeWidth" | "fill">>) => {
      if (!isDrawer || !selectedId) return;
      const before = shapesRef.current.find((s) => s.id === selectedId);
      if (!before) return;
      const after = constrainShapeToBoard({
        ...before,
        ...patch,
        ...(before.geometry.kind === "fill" && patch.stroke
          ? { fill: patch.stroke, stroke: patch.stroke }
          : {}),
      });
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

  const setStrokeColor = React.useCallback(
    (c: string) => {
      setStrokeColorState(c);
      applyStyleToSelected({ stroke: c });
    },
    [applyStyleToSelected],
  );

  const setFillColor = React.useCallback(
    (c: string | "none") => {
      setFillColorState(c);
      applyStyleToSelected({ fill: c });
    },
    [applyStyleToSelected],
  );

  /** Alias: palette historically drove stroke only. */
  const setColor = setStrokeColor;

  const applyPaletteColor = React.useCallback(
    (c: string) => {
      if (colorTarget === "fill") {
        setFillColor(c);
      } else {
        setStrokeColor(c);
      }
    },
    [colorTarget, setFillColor, setStrokeColor],
  );

  const setStrokeWidth = React.useCallback(
    (w: StrokeWidth) => {
      setStrokeWidthState(w);
      applyStyleToSelected({ strokeWidth: w });
    },
    [applyStyleToSelected],
  );

  const setTool = React.useCallback(
    (t: WhiteboardTool) => {
      if (bezierDraft) callbacksRef.current.onShapePreviewCancelled?.(bezierDraft.id);
      if (draft) callbacksRef.current.onShapePreviewCancelled?.(draft.id);
      setToolState(t);
      setBezierDraft(null);
      setDraft(null);
      // Drawing tools clear selection so the next pointer starts a stroke.
      // Hand keeps selection so pan doesn't wipe the edit target.
      if (t !== "select" && t !== "hand") {
        setSelectedIds([]);
      }
      if (t === "fill") {
        setColorTarget("fill");
      }
    },
    [bezierDraft, draft],
  );

  const commitShape = React.useCallback(
    (shape: WhiteboardShape) => {
      const constrained = constrainShapeToBoard(shape);
      const op: HistoryOp = { type: "add", shape: constrained };
      historyRef.current.push(op);
      syncHistoryFlags();
      const next = [...shapesRef.current, constrained];
      replaceShapes(next);
      setSelectedIds([]);
      callbacksRef.current.onShapeCreated?.(constrained);
      emitShapesChange.flush();
    },
    [replaceShapes, syncHistoryFlags, emitShapesChange],
  );

  const previewShapeCreation = React.useCallback((shape: WhiteboardShape) => {
    callbacksRef.current.onShapePreview?.(constrainShapeToBoard(shape));
  }, []);

  const cancelShapeCreationPreview = React.useCallback((shapeId: string) => {
    callbacksRef.current.onShapePreviewCancelled?.(shapeId);
  }, []);

  const beginShapeUpdate = React.useCallback((before: WhiteboardShape) => {
    editBeforeRef.current = cloneShape(before);
    editSnapshotRef.current = null;
  }, []);

  const beginMultiShapeUpdate = React.useCallback(() => {
    editBeforeRef.current = null;
    editSnapshotRef.current = cloneShapes(shapesRef.current);
  }, []);

  const previewShapeUpdate = React.useCallback(
    (
      shape: WhiteboardShape,
      opts?: { constrain?: ConstrainMode | false },
    ) => {
      const constrained =
        opts?.constrain === false
          ? shape
          : constrainShapeToBoard(
              shape,
              undefined,
              opts?.constrain ? { mode: opts.constrain } : undefined,
            );
      const next = shapesRef.current.map((s) =>
        s.id === constrained.id ? constrained : s,
      );
      replaceShapes(next, false);
      callbacksRef.current.onShapePreview?.(constrained);
    },
    [replaceShapes],
  );

  const previewShapesPatch = React.useCallback(
    (patched: WhiteboardShape[]) => {
      const byId = new Map(
        patched.map((s) => [s.id, constrainShapeToBoard(s)] as const),
      );
      const next = shapesRef.current.map((s) => byId.get(s.id) ?? s);
      replaceShapes(next, false);
      for (const s of byId.values()) {
        callbacksRef.current.onShapePreview?.(s);
      }
    },
    [replaceShapes],
  );

  const commitShapeUpdate = React.useCallback(() => {
    const snapshot = editSnapshotRef.current;
    editSnapshotRef.current = null;
    if (snapshot) {
      const after = shapesRef.current;
      if (JSON.stringify(snapshot) === JSON.stringify(after)) {
        emitShapesChange.flush();
        return;
      }
      historyRef.current.push({
        type: "replace",
        before: snapshot,
        after: cloneShapes(after),
      });
      syncHistoryFlags();
      const beforeById = new Map(snapshot.map((s) => [s.id, s]));
      for (const s of after) {
        const prev = beforeById.get(s.id);
        if (prev && JSON.stringify(prev) !== JSON.stringify(s)) {
          callbacksRef.current.onShapeUpdated?.(s);
        }
      }
      emitShapesChange.flush();
      return;
    }

    const before = editBeforeRef.current;
    editBeforeRef.current = null;
    if (!before) {
      emitShapesChange.flush();
      return;
    }
    const dirty = shapesRef.current.find((s) => s.id === before.id);
    if (!dirty) {
      emitShapesChange.flush();
      return;
    }
    // Handle drags preview with point-clamp only; fit on commit so stroke /
    // arrowheads stay on-board without warping mid-drag.
    const after = constrainShapeToBoard(dirty);
    if (JSON.stringify(dirty) !== JSON.stringify(after)) {
      replaceShapes(
        shapesRef.current.map((s) => (s.id === after.id ? after : s)),
        false,
      );
    }
    if (JSON.stringify(before) === JSON.stringify(after)) {
      return;
    }
    historyRef.current.push({
      type: "update",
      before: cloneShape(before),
      after: cloneShape(after),
    });
    syncHistoryFlags();
    callbacksRef.current.onShapeUpdated?.(after);
    emitShapesChange.flush();
  }, [syncHistoryFlags, emitShapesChange, replaceShapes]);

  const cancelShapeUpdate = React.useCallback(() => {
    const snapshot = editSnapshotRef.current;
    editSnapshotRef.current = null;
    if (snapshot) {
      editBeforeRef.current = null;
      replaceShapes(snapshot);
      emitShapesChange.flush();
      return;
    }
    const before = editBeforeRef.current;
    editBeforeRef.current = null;
    if (!before) return;
    const next = shapesRef.current.map((s) => (s.id === before.id ? before : s));
    replaceShapes(next);
    callbacksRef.current.onShapePreview?.(before);
    emitShapesChange.flush();
  }, [replaceShapes, emitShapesChange]);

  const deleteShapeById = React.useCallback(
    (shapeId: string) => {
      if (!isDrawer) return;
      const index = shapesRef.current.findIndex((s) => s.id === shapeId);
      if (index < 0) return;
      const shape = shapesRef.current[index]!;
      historyRef.current.push({
        type: "remove",
        shape: cloneShape(shape),
        index,
      });
      syncHistoryFlags();
      replaceShapes(shapesRef.current.filter((s) => s.id !== shapeId));
      setSelectedIds((ids) => ids.filter((id) => id !== shapeId));
      callbacksRef.current.onShapeDeleted?.(shapeId);
      emitShapesChange.flush();
    },
    [isDrawer, replaceShapes, syncHistoryFlags, emitShapesChange],
  );

  const deleteSelected = React.useCallback(() => {
    if (!isDrawer || selectedIds.length === 0) return;
    const idSet = new Set(selectedIds);
    const removed = shapesRef.current.filter((s) => idSet.has(s.id));
    if (removed.length === 0) return;
    if (removed.length === 1) {
      deleteShapeById(removed[0]!.id);
      announce("Shape deleted");
      return;
    }
    const before = cloneShapes(shapesRef.current);
    const after = before.filter((s) => !idSet.has(s.id));
    historyRef.current.push({ type: "replace", before, after });
    for (const shape of removed) {
      callbacksRef.current.onShapeDeleted?.(shape.id);
    }
    syncHistoryFlags();
    replaceShapes(after);
    setSelectedIds([]);
    emitShapesChange.flush();
    announce("Shapes deleted");
  }, [
    isDrawer,
    selectedIds,
    deleteShapeById,
    replaceShapes,
    syncHistoryFlags,
    emitShapesChange,
    announce,
  ]);

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
    setSelectedIds([pasted.id]);
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
    setSelectedIds([dup.id]);
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
      if (!isDrawer || selectedIds.length === 0 || (!dx && !dy)) return;
      const idSet = new Set(selectedIds);
      const targets = shapesRef.current.filter((s) => idSet.has(s.id));
      if (targets.length === 0) return;
      if (targets.length === 1) {
        const before = targets[0]!;
        const after = constrainShapeToBoard(translateShape(before, dx, dy));
        historyRef.current.push({
          type: "update",
          before: cloneShape(before),
          after: cloneShape(after),
        });
        syncHistoryFlags();
        const next = shapesRef.current.map((s) => (s.id === after.id ? after : s));
        replaceShapes(next);
        callbacksRef.current.onShapeUpdated?.(after);
      } else {
        const snapshot = cloneShapes(shapesRef.current);
        const next = shapesRef.current.map((s) =>
          idSet.has(s.id) ? constrainShapeToBoard(translateShape(s, dx, dy)) : s,
        );
        historyRef.current.push({
          type: "replace",
          before: snapshot,
          after: cloneShapes(next),
        });
        syncHistoryFlags();
        replaceShapes(next);
        for (const s of next) {
          if (idSet.has(s.id)) callbacksRef.current.onShapeUpdated?.(s);
        }
      }
      emitShapesChange.flush();
    },
    [isDrawer, selectedIds, replaceShapes, syncHistoryFlags, emitShapesChange],
  );

  const undo = React.useCallback(() => {
    if (!isDrawer) return;
    const result = historyRef.current.undo(shapesRef.current);
    if (!result) return;
    syncHistoryFlags();
    replaceShapes(result.shapes);
    setSelectedIds([]);
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
    setSelectedIds([]);
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
    setSelectedIds([]);
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
      setSelectedIds([]);
      editBeforeRef.current = null;
      editSnapshotRef.current = null;
      replaceShapes(
        cloneShapes(next).map((shape) => constrainShapeToBoard(shape)),
        true,
      );
      emitShapesChange.flush();
    },
    [replaceShapes, syncHistoryFlags, emitShapesChange],
  );

  const applyRemoteShape = React.useCallback(
    (shape: WhiteboardShape) => {
      const constrained = constrainShapeToBoard(shape);
      const index = shapesRef.current.findIndex((s) => s.id === constrained.id);
      if (index < 0) {
        replaceShapes([...shapesRef.current, constrained]);
        return;
      }
      const next = [...shapesRef.current];
      next[index] = constrained;
      replaceShapes(next);
    },
    [replaceShapes],
  );

  const applyRemoteDelete = React.useCallback(
    (shapeId: string) => {
      setSelectedIds((ids) => ids.filter((id) => id !== shapeId));
      replaceShapes(shapesRef.current.filter((s) => s.id !== shapeId));
    },
    [replaceShapes],
  );

  const applyRemoteClear = React.useCallback(() => {
    historyRef.current.clear();
    syncHistoryFlags();
    setSelectedIds([]);
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
      id: d.id,
      tool: "bezier",
      stroke: strokeColor,
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
      createdAt: d.createdAt,
    };
    setBezierDraft(null);
    commitShape(shape);
    announce("Line committed");
  }, [bezierDraft, strokeColor, strokeWidth, playerId, commitShape, announce]);

  const cancelBezierDraft = React.useCallback(() => {
    if (bezierDraft) {
      callbacksRef.current.onShapePreviewCancelled?.(bezierDraft.id);
    }
    setBezierDraft(null);
    announce("Line cancelled");
  }, [announce, bezierDraft]);

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
        } else if (selectedIds.length) {
          e.preventDefault();
          setSelectedIds([]);
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
    selectedIds,
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
    if (!isDrawer) setSelectedIds([]);
  }, [isDrawer]);

  // clipboardVersion forces canPaste recompute when clipboard changes
  void clipboardVersion;

  const canPaste = isDrawer && clipboardRef.current != null;
  const canCopy = isDrawer && selectedId != null;
  const canDelete = canCopy;
  const canClear = isDrawer && shapes.length > 0;
  const canDuplicate = canCopy;
  const canBringFwd =
    isDrawer && selectedId != null && canBringForward(shapes, selectedId);
  const canSendBack =
    isDrawer && selectedId != null && canSendBackward(shapes, selectedId);

  return {
    shapes,
    tool,
    setTool,
    color: strokeColor,
    setColor,
    strokeColor,
    setStrokeColor,
    fillColor,
    setFillColor,
    colorTarget,
    setColorTarget,
    applyPaletteColor,
    strokeWidth,
    setStrokeWidth,
    fillTolerance,
    setFillTolerance,
    snapToGrid,
    setSnapToGrid,
    gridSize: GRID_SIZE,
    draft,
    bezierDraft,
    selectedId,
    selectedIds,
    selectShape,
    selectShapes,
    canUndo,
    canRedo,
    canPaste,
    canCopy,
    canDelete,
    canClear,
    canDuplicate,
    canBringForward: canBringFwd,
    canSendBackward: canSendBack,
    isDrawer,
    isFilling,
    preferDraw,
    undo,
    redo,
    clear,
    deleteSelected,
    deleteShapeById,
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
    previewShapeCreation,
    cancelShapeCreationPreview,
    previewShapeUpdate,
    previewShapesPatch,
    beginShapeUpdate,
    beginMultiShapeUpdate,
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
