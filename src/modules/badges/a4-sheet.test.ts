import { describe, expect, it } from "vitest";
import {
  chunkForPages,
  computeA4SheetLayout,
  parseBadgePrintSheet,
} from "./a4-sheet";

describe("computeA4SheetLayout", () => {
  it("fits nine CR80 portrait badges on A4", () => {
    const layout = computeA4SheetLayout(54, 85.6);
    expect(layout.cols).toBe(3);
    expect(layout.rows).toBe(3);
    expect(layout.perPage).toBe(9);
  });

  it("fits eight CR80 landscape badges on A4", () => {
    const layout = computeA4SheetLayout(85.6, 54);
    expect(layout.cols).toBe(2);
    expect(layout.rows).toBe(4);
    expect(layout.perPage).toBe(8);
  });
});

describe("chunkForPages", () => {
  it("splits badges into full pages", () => {
    expect(chunkForPages([1, 2, 3, 4, 5], 2)).toEqual([
      [1, 2],
      [3, 4],
      [5],
    ]);
  });
});

describe("parseBadgePrintSheet", () => {
  it("accepts label and a4", () => {
    expect(parseBadgePrintSheet("a4")).toBe("a4");
    expect(parseBadgePrintSheet("label")).toBe("label");
    expect(parseBadgePrintSheet("weird", "label")).toBe("label");
  });
});
