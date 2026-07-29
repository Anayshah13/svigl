import { describe, expect, it } from "vitest";
import { parseHintSlots } from "../word-display";

describe("parseHintSlots", () => {
  it("returns empty for missing hints", () => {
    expect(parseHintSlots(null)).toEqual([]);
    expect(parseHintSlots(undefined)).toEqual([]);
    expect(parseHintSlots("")).toEqual([]);
  });

  it("parses a single-word blank mask", () => {
    expect(parseHintSlots("_ _ _")).toEqual(["_", "_", "_"]);
  });

  it("preserves a word gap from the server triple-space format", () => {
    // word_hint_mask("ice cream") → "_ _ _   _ _ _ _ _"
    expect(parseHintSlots("_ _ _   _ _ _ _ _")).toEqual([
      "_",
      "_",
      "_",
      " ",
      "_",
      "_",
      "_",
      "_",
      "_",
    ]);
  });

  it("preserves multiple word gaps", () => {
    // word_hint_mask("a b c") → "_   _   _"
    expect(parseHintSlots("_   _   _")).toEqual(["_", " ", "_", " ", "_"]);
  });

  it("keeps revealed letters and gaps together", () => {
    expect(parseHintSlots("i _ e   c _ e a m")).toEqual([
      "i",
      "_",
      "e",
      " ",
      "c",
      "_",
      "e",
      "a",
      "m",
    ]);
  });

  it("does not invent gaps for single-word hints", () => {
    expect(parseHintSlots("_ _ _ _ _ _")).toEqual([
      "_",
      "_",
      "_",
      "_",
      "_",
      "_",
    ]);
    expect(parseHintSlots("b a n a n a")).toEqual([
      "b",
      "a",
      "n",
      "a",
      "n",
      "a",
    ]);
  });
});
