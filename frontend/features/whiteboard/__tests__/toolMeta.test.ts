import { describe, expect, it } from "vitest";
import {
  isEditableTarget,
  TOOL_BY_ID,
  TOOL_META,
  TOOL_SHORTCUT_MAP,
} from "../toolMeta";

describe("toolMeta", () => {
  it("includes select as a first-class tool with shortcut 1", () => {
    expect(TOOL_META.some((t) => t.id === "select")).toBe(true);
    expect(TOOL_SHORTCUT_MAP["1"]).toBe("select");
    expect(TOOL_SHORTCUT_MAP["2"]).toBe("bezier");
    expect(TOOL_SHORTCUT_MAP["3"]).toBe("rectangle");
    expect(TOOL_SHORTCUT_MAP["4"]).toBe("ellipse");
    expect(TOOL_SHORTCUT_MAP["5"]).toBe("arrow");
    expect(TOOL_SHORTCUT_MAP["6"]).toBe("fill");
    expect(TOOL_SHORTCUT_MAP["7"]).toBe("eraser");
    expect(TOOL_SHORTCUT_MAP["8"]).toBe("hand");
  });

  it("maps letter shortcuts for select, eraser, and hand", () => {
    expect(TOOL_SHORTCUT_MAP.v).toBe("select");
    expect(TOOL_SHORTCUT_MAP.e).toBe("eraser");
    expect(TOOL_SHORTCUT_MAP.x).toBe("eraser");
    expect(TOOL_SHORTCUT_MAP.h).toBe("hand");
  });

  it("labels bezier as Line (id stays bezier)", () => {
    const bezier = TOOL_META.find((t) => t.id === "bezier");
    expect(bezier?.label).toBe("Line");
  });

  it("lists eraser and hand in TOOL_META", () => {
    expect(TOOL_META.map((t) => t.id)).toEqual([
      "select",
      "bezier",
      "rectangle",
      "ellipse",
      "arrow",
      "fill",
      "eraser",
      "hand",
    ]);
  });

  it('labels bezier tool as "Line" (curve under the hood)', () => {
    expect(TOOL_BY_ID.bezier.label).toBe("Line");
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
