import { describe, expect, it } from "vitest";
import {
  HOVER_DURATION_MAX_MS,
  HOVER_DURATION_MIN_MS,
  hoverPlaybackDurationMs,
  remapEventsForHover,
} from "../duration";
import type { ReplayEvent } from "../types";

function ev(t: number, id: string): ReplayEvent {
  return {
    t,
    type: "shape.created",
    player_id: "u1",
    tool: "pencil",
    payload: {
      shape: {
        id,
        tool: "pencil",
        stroke: "#000",
        fill: "none",
        strokeWidth: 4,
        transform: "",
        geometry: { kind: "pencil", d: "M 0 0 L 1 1" },
        createdBy: "u1",
        createdAt: 1,
      },
    },
  };
}

describe("hoverPlaybackDurationMs", () => {
  it("clamps between 1s and 5s by action count", () => {
    expect(hoverPlaybackDurationMs(0)).toBe(0);
    expect(hoverPlaybackDurationMs(1)).toBe(HOVER_DURATION_MIN_MS);
    expect(hoverPlaybackDurationMs(30)).toBe(HOVER_DURATION_MAX_MS);
    expect(hoverPlaybackDurationMs(100)).toBe(HOVER_DURATION_MAX_MS);
    const mid = hoverPlaybackDurationMs(15);
    expect(mid).toBeGreaterThan(HOVER_DURATION_MIN_MS);
    expect(mid).toBeLessThan(HOVER_DURATION_MAX_MS);
  });
});

describe("remapEventsForHover", () => {
  it("evenly spaces actions inside the hover window", () => {
    const remapped = remapEventsForHover([
      ev(0, "a"),
      ev(30_000, "b"),
      ev(60_000, "c"),
    ]);
    const duration = hoverPlaybackDurationMs(3);
    expect(remapped.map((e) => e.t)).toEqual([0, Math.round(duration / 2), duration]);
    expect(duration).toBeGreaterThanOrEqual(HOVER_DURATION_MIN_MS);
    expect(duration).toBeLessThanOrEqual(HOVER_DURATION_MAX_MS);
    // Original minute-scale timestamps are discarded.
    expect(remapped.every((e) => e.t <= duration)).toBe(true);
    expect(remapped[2]?.payload).toEqual(ev(60_000, "c").payload);
  });
});
