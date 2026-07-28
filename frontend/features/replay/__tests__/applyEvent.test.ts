import { describe, expect, it } from "vitest";
import { applyReplayEvent, reconstructShapes } from "../applyEvent";
import type { ReplayEvent } from "../types";
import type { WhiteboardShape } from "@/features/whiteboard/types";

const baseShape = (id: string, d = "M 0 0 L 10 10"): WhiteboardShape => ({
  id,
  tool: "pencil",
  stroke: "#000",
  fill: "none",
  strokeWidth: 4,
  transform: "",
  geometry: { kind: "pencil", d },
  createdBy: "u1",
  createdAt: 1,
});

function ev(
  partial: Partial<ReplayEvent> & Pick<ReplayEvent, "type" | "payload">,
): ReplayEvent {
  return {
    t: partial.t ?? 0,
    type: partial.type,
    player_id: partial.player_id ?? "u1",
    tool: partial.tool ?? "pencil",
    payload: partial.payload,
  };
}

describe("applyReplayEvent", () => {
  it("creates and updates shapes", () => {
    let shapes: WhiteboardShape[] = [];
    shapes = applyReplayEvent(
      shapes,
      ev({
        type: "shape.created",
        payload: { shape: baseShape("a") },
      }),
    );
    expect(shapes).toHaveLength(1);
    shapes = applyReplayEvent(
      shapes,
      ev({
        type: "shape.updated",
        payload: { shape: baseShape("a", "M 1 1 L 2 2") },
      }),
    );
    expect(shapes).toHaveLength(1);
    expect(shapes[0]?.geometry).toEqual({ kind: "pencil", d: "M 1 1 L 2 2" });
  });

  it("deletes, clears, and undoes via HistoryOp", () => {
    const a = baseShape("a");
    const b = baseShape("b");
    let shapes = [a, b];
    shapes = applyReplayEvent(
      shapes,
      ev({ type: "shape.deleted", tool: "eraser", payload: { shape_id: "a" } }),
    );
    expect(shapes.map((s) => s.id)).toEqual(["b"]);

    shapes = applyReplayEvent(
      shapes,
      ev({
        type: "undo",
        tool: null,
        payload: { op: { type: "remove", shape: a, index: 0 } },
      }),
    );
    expect(shapes.map((s) => s.id)).toEqual(["a", "b"]);

    shapes = applyReplayEvent(
      shapes,
      ev({ type: "canvas.cleared", tool: null, payload: {} }),
    );
    expect(shapes).toEqual([]);
  });

  it("reconstructShapes applies a prefix of the timeline", () => {
    const events: ReplayEvent[] = [
      ev({ t: 0, type: "shape.created", payload: { shape: baseShape("a") } }),
      ev({ t: 100, type: "shape.created", payload: { shape: baseShape("b") } }),
      ev({
        t: 200,
        type: "shape.deleted",
        tool: "eraser",
        payload: { shape_id: "a" },
      }),
    ];
    expect(reconstructShapes(events, 0)).toEqual([]);
    expect(reconstructShapes(events, 2).map((s) => s.id)).toEqual(["a", "b"]);
    expect(reconstructShapes(events, 3).map((s) => s.id)).toEqual(["b"]);
  });
});
