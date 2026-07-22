import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/services/app-websocket", () => {
  const handlers = new Set<(type: string, payload: Record<string, unknown>) => void>();
  return {
    appWebSocket: {
      bufferedAmount: 0,
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
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
    (appWebSocket as unknown as { bufferedAmount: number }).bufferedAmount = 0;
  });

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

  it("publishes committed shape updates via sendRaw", () => {
    const client = createCanvasSyncClient();
    client.attach();
    const shape = rect("stroke-1");
    client.publishShapeUpdated(shape);
    client.flushShapeUpdated();
    expect(appWebSocket.sendRaw).toHaveBeenCalledWith("SHAPE_UPDATED", { shape });
    client.publishShapeCreated(shape);
    expect(appWebSocket.sendRaw).toHaveBeenCalledWith("SHAPE_CREATED", { shape });
  });

  it("rejects snapshots older than the active epoch sequence", () => {
    const client = createCanvasSyncClient();
    client.applySnapshot({
      session_id: "sess-1",
      current_turn: 2,
      op_seq: 8,
      shapes: [rect("new")],
    });
    client.applySnapshot({
      session_id: "sess-1",
      current_turn: 2,
      op_seq: 7,
      shapes: [rect("stale")],
    });
    client.applySnapshot({
      session_id: "sess-1",
      current_turn: 1,
      op_seq: 99,
      shapes: [rect("old-turn")],
    });

    expect(client.getShapes().map((shape) => shape.id)).toEqual(["new"]);
    expect(client.getSnapshot().opSeq).toBe(8);
  });

  it("coalesces previews independently by shape id", () => {
    vi.useFakeTimers();
    vi.setSystemTime(1_000);
    const client = createCanvasSyncClient();
    const a = rect("a");
    const b = rect("b");
    client.publishShapePreview(a);
    client.publishShapePreview(b);

    vi.setSystemTime(1_010);
    const latestA = {
      ...a,
      geometry: { ...a.geometry, width: 42 },
    } as WhiteboardShape;
    client.publishShapePreview(latestA);
    vi.advanceTimersByTime(33);

    expect(appWebSocket.sendRaw).toHaveBeenCalledWith("SHAPE_UPDATED", {
      shape: a,
      ephemeral: true,
    });
    expect(appWebSocket.sendRaw).toHaveBeenCalledWith("SHAPE_UPDATED", {
      shape: b,
      ephemeral: true,
    });
    expect(appWebSocket.sendRaw).toHaveBeenCalledWith("SHAPE_UPDATED", {
      shape: latestA,
      ephemeral: true,
    });
  });

  it("cancels queued previews on clear", () => {
    vi.useFakeTimers();
    vi.setSystemTime(1_000);
    const client = createCanvasSyncClient();
    const shape = rect("draft");
    client.publishShapePreview(shape);
    vi.setSystemTime(1_001);
    client.publishShapePreview({ ...shape, stroke: "#fff" });
    client.publishClear();
    vi.advanceTimersByTime(100);

    const previewCalls = vi
      .mocked(appWebSocket.sendRaw)
      .mock.calls.filter(
        ([type, payload]) => type === "SHAPE_UPDATED" && payload?.ephemeral,
      );
    expect(previewCalls).toHaveLength(1);
  });

  it("holds and coalesces previews while the socket is backpressured", () => {
    vi.useFakeTimers();
    const socket = appWebSocket as unknown as { bufferedAmount: number };
    socket.bufferedAmount = 300_000;
    const client = createCanvasSyncClient();
    const shape = rect("backpressured");
    const latest = { ...shape, stroke: "#fff" };

    client.publishShapePreview(shape);
    client.publishShapePreview(latest);
    expect(appWebSocket.sendRaw).not.toHaveBeenCalled();

    socket.bufferedAmount = 0;
    vi.advanceTimersByTime(33);
    expect(appWebSocket.sendRaw).toHaveBeenCalledWith("SHAPE_UPDATED", {
      shape: latest,
      ephemeral: true,
    });
  });
});
