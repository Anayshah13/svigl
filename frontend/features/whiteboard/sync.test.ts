import { describe, expect, it, vi } from "vitest";

vi.mock("@/services/app-websocket", () => {
  const handlers = new Set<(type: string, payload: Record<string, unknown>) => void>();
  return {
    appWebSocket: {
      sendRaw: vi.fn(() => true),
      subscribeCanvas: (fn: (type: string, payload: Record<string, unknown>) => void) => {
        handlers.add(fn);
        return () => handlers.delete(fn);
      },
      __emit(type: string, payload: Record<string, unknown>) {
        for (const handler of handlers) handler(type, payload);
      },
      __handlers: handlers,
    },
  };
});

import { createCanvasSyncClient } from "@/features/whiteboard/sync";
import { appWebSocket } from "@/services/app-websocket";
import type { WhiteboardShape } from "@/features/whiteboard/types";

const rect = (id: string): WhiteboardShape => ({
  id,
  tool: "rectangle",
  stroke: "#2C2C2C",
  fill: "none",
  strokeWidth: 2,
  transform: "",
  geometry: { kind: "rectangle", x: 0, y: 0, width: 10, height: 10 },
  createdBy: "user-1",
  createdAt: 1,
});

describe("canvas sync client", () => {
  it("applies CANVAS_SNAPSHOT then live SHAPE_CREATED ops", () => {
    const client = createCanvasSyncClient();
    const seen: WhiteboardShape[][] = [];
    const stop = client.attach({
      onShapes: (shapes) => {
        seen.push(shapes);
      },
    });

    (appWebSocket as unknown as { __emit: (t: string, p: Record<string, unknown>) => void }).__emit(
      "CANVAS_SNAPSHOT",
      {
        session_id: "sess-1",
        current_turn: 0,
        op_seq: 2,
        shapes: [rect("a")],
        can_draw: false,
      },
    );

    expect(client.getShapes()).toHaveLength(1);
    expect(client.getSnapshot().opSeq).toBe(2);

    (appWebSocket as unknown as { __emit: (t: string, p: Record<string, unknown>) => void }).__emit(
      "SHAPE_CREATED",
      {
        shape: rect("b"),
        op_seq: 3,
        session_id: "sess-1",
        current_turn: 0,
      },
    );

    expect(client.getShapes().map((s) => s.id).sort()).toEqual(["a", "b"]);

    (appWebSocket as unknown as { __emit: (t: string, p: Record<string, unknown>) => void }).__emit(
      "CANVAS_CLEARED",
      { op_seq: 4, reason: "round_started", shapes: [] },
    );
    expect(client.getShapes()).toEqual([]);

    stop();
    expect(seen.length).toBeGreaterThanOrEqual(3);
  });

  it("publishes throttled shape updates via sendRaw", () => {
    const client = createCanvasSyncClient();
    client.attach();
    const shape = rect("stroke-1");
    client.publishShapeUpdated(shape);
    client.flushShapeUpdated();
    expect(appWebSocket.sendRaw).toHaveBeenCalledWith("SHAPE_UPDATED", { shape });
    client.publishShapeCreated(shape);
    expect(appWebSocket.sendRaw).toHaveBeenCalledWith("SHAPE_CREATED", { shape });
  });
});
