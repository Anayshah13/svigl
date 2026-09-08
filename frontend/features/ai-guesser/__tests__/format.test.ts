import { describe, expect, it } from "vitest";
import { formatClockMs, formatSplitMs } from "../format";
import { isWeeklyGameSlug } from "../week";

describe("time-trial formatters", () => {
  it("formats splits under a minute as seconds", () => {
    expect(formatSplitMs(23_400)).toBe("23.4s");
  });

  it("formats the HUD clock with a minute", () => {
    expect(formatClockMs(70_000)).toBe("1:10.0");
    expect(formatClockMs(5_000)).toBe("0:05.0");
  });

  it("knows the five weekly slugs", () => {
    expect(isWeeklyGameSlug("sports")).toBe(true);
    expect(isWeeklyGameSlug("pop-culture")).toBe(true);
    expect(isWeeklyGameSlug("free-play")).toBe(false);
  });
});
