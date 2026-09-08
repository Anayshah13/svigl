import { describe, expect, it } from "vitest";
import { isAbortError } from "../api";

describe("isAbortError", () => {
  it("recognizes a DOM AbortError", () => {
    expect(isAbortError(new DOMException("The operation was aborted.", "AbortError"))).toBe(
      true,
    );
  });

  it("recognizes Chromium's TypeError abort", () => {
    expect(isAbortError(new TypeError("signal is aborted without reason"))).toBe(
      true,
    );
  });

  it("does not treat ordinary failures as aborts", () => {
    expect(isAbortError(new Error("Network request failed"))).toBe(false);
    expect(isAbortError(new TypeError("Failed to fetch"))).toBe(false);
    expect(isAbortError(null)).toBe(false);
  });
});
