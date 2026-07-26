import { describe, expect, it } from "vitest";
import {
  isEditableTarget,
  TOOL_BY_ID,
  TOOL_META,
  TOOL_SHORTCUT_MAP,
} from "../toolMeta";

describe("toolMeta", () => {
  it("registers pencil as the primary tool with shortcut 1", () => {
    expect(TOOL_META[0]?.id).toBe("pencil");
    expect(TOOL_SHORTCUT_MAP["1"]).toBe("pencil");
    expect(TOOL_SHORTCUT_MAP["2"]).toBe("select");
    expect(TOOL_SHORTCUT_MAP["3"]).toBe("bezier");
    expect(TOOL_SHORTCUT_MAP["4"]).toBe("rectangle");
    expect(TOOL_SHORTCUT_MAP["5"]).toBe("ellipse");
    expect(TOOL_SHORTCUT_MAP["6"]).toBe("fill");
    expect(TOOL_SHORTCUT_MAP["7"]).toBe("eraser");
    expect(TOOL_SHORTCUT_MAP["8"]).toBeUndefined();
  });

  it("maps letter shortcuts for pencil, select, and eraser", () => {
    expect(TOOL_SHORTCUT_MAP.b).toBe("pencil");
    expect(TOOL_SHORTCUT_MAP.p).toBe("pencil");
    expect(TOOL_SHORTCUT_MAP.v).toBe("select");
    expect(TOOL_SHORTCUT_MAP.e).toBe("eraser");
    expect(TOOL_SHORTCUT_MAP.x).toBe("eraser");
    expect(TOOL_SHORTCUT_MAP.h).toBeUndefined();
  });

  it("labels bezier as Line (id stays bezier)", () => {
    const bezier = TOOL_META.find((t) => t.id === "bezier");
    expect(bezier?.label).toBe("Line");
  });

  it("lists tools in TOOL_META with pencil first", () => {
    expect(TOOL_META.map((t) => t.id)).toEqual([
      "pencil",
      "select",
      "bezier",
      "rectangle",
      "ellipse",
      "fill",
      "eraser",
    ]);
  });

  it("exposes pencil via TOOL_BY_ID", () => {
    expect(TOOL_BY_ID.pencil.label).toBe("Pencil");
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
