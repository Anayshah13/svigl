import { afterEach, describe, expect, it, vi } from "vitest";
import { throttle } from "../throttle";

describe("throttle", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("limits calls and flushes trailing args", () => {
    vi.useFakeTimers();
    const spy = vi.fn();
    const t = throttle(spy, 100);

    t(1);
    t(2);
    t(3);
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenLastCalledWith(1);

    vi.advanceTimersByTime(100);
    expect(spy).toHaveBeenCalledTimes(2);
    expect(spy).toHaveBeenLastCalledWith(3);
  });

  it("flush invokes pending immediately", () => {
    vi.useFakeTimers();
    const spy = vi.fn();
    const t = throttle(spy, 100);
    t("a");
    t("b");
    t.flush();
    expect(spy).toHaveBeenLastCalledWith("b");
  });
});
