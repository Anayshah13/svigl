import { describe, expect, it } from "vitest";
import { isEditableTarget, TOOL_META, TOOL_SHORTCUT_MAP } from "../toolMeta";

describe("toolMeta", () => {
  it("includes select as a first-class tool with shortcut V", () => {
    expect(TOOL_META.some((t) => t.id === "select")).toBe(true);
    expect(TOOL_SHORTCUT_MAP.v).toBe("select");
    expect(TOOL_SHORTCUT_MAP.b).toBe("bezier");
    expect(TOOL_SHORTCUT_MAP.r).toBe("rectangle");
    expect(TOOL_SHORTCUT_MAP.e).toBe("ellipse");
    expect(TOOL_SHORTCUT_MAP.a).toBe("arrow");
    expect(TOOL_SHORTCUT_MAP.f).toBe("fill");
  });

  it("detects editable targets so shortcuts do not steal typing", () => {
    expect(isEditableTarget(null)).toBe(false);
    const input = {
      tagName: "INPUT",
      isContentEditable: false,
      closest: () => null,
    } as unknown as HTMLElement;
    expect(isEditableTarget(input)).toBe(true);
    const div = {
      tagName: "DIV",
      isContentEditable: false,
      closest: () => null,
    } as unknown as HTMLElement;
    expect(isEditableTarget(div)).toBe(false);
  });
});
