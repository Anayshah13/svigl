"use client";

import { create } from "zustand";
import type { DrawingDocument, DrawingTool, Shape } from "@/types/drawing";

interface OperationRecord {
  operationId: string;
  shapeId: string;
}

interface DocumentStore {
  document: DrawingDocument | null;
  previews: Record<string, Partial<Shape>>;
  operationHistory: OperationRecord[];
  tool: DrawingTool;
  setDocument: (doc: DrawingDocument | null) => void;
  setPreview: (shapeId: string, preview: Partial<Shape>) => void;
  clearPreview: (shapeId: string) => void;
  setTool: (tool: DrawingTool) => void;
  commitLocal: (shape: Shape) => void;
  undoLocal: () => void;
}

export const useDocumentStore = create<DocumentStore>((set) => ({
  document: null,
  previews: {},
  operationHistory: [],
  tool: "pointer",
  setDocument: (document) => set({ document, operationHistory: [] }),
  setPreview: (shapeId, preview) =>
    set((s) => ({ previews: { ...s.previews, [shapeId]: preview } })),
  clearPreview: (shapeId) =>
    set((s) => {
      const { [shapeId]: _drop, ...rest } = s.previews;
      void _drop;
      return { previews: rest };
    }),
  setTool: (tool) => set({ tool }),
  commitLocal: (shape) =>
    set((s) => {
      const operationId = `local-${Date.now()}-${shape.id}`;
      if (!s.document) {
        return {
          document: {
            id: "local-doc",
            version: 1,
            createdAt: Date.now(),
            operations: [],
            shapes: [shape],
          },
          operationHistory: [{ operationId, shapeId: shape.id }],
          previews: {},
        };
      }
      const shapes = s.document.shapes.some((x) => x.id === shape.id)
        ? s.document.shapes.map((x) => (x.id === shape.id ? shape : x))
        : [...s.document.shapes, shape];
      const { [shape.id]: _drop, ...rest } = s.previews;
      void _drop;
      return {
        document: { ...s.document, shapes, version: s.document.version + 1 },
        previews: rest,
        operationHistory: [...s.operationHistory, { operationId, shapeId: shape.id }],
      };
    }),
  undoLocal: () =>
    set((s) => {
      if (!s.document || s.operationHistory.length === 0) return s;
      const last = s.operationHistory[s.operationHistory.length - 1];
      const shapes = s.document.shapes.filter((x) => x.id !== last.shapeId);
      return {
        document: { ...s.document, shapes, version: s.document.version + 1 },
        operationHistory: s.operationHistory.slice(0, -1),
      };
    }),
}));
