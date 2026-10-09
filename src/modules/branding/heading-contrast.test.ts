import { describe, expect, it } from "vitest";
import {
  headingContrastOk,
  heroOverlayStops,
  photoOverlayBackground,
  suggestHeadingColor,
} from "./heading-contrast";

describe("heading contrast", () => {
  it("flags white on white", () => {
    expect(headingContrastOk("#FFFFFF", "#FFFFFF")).toBe(false);
  });

  it("accepts white on indigo", () => {
    expect(headingContrastOk("#FFFFFF", "#4F46E5")).toBe(true);
  });

  it("suggests dark on light backgrounds", () => {
    expect(suggestHeadingColor("#FFFFFF")).toBe("#0F172A");
    expect(suggestHeadingColor("#4F46E5")).toBe("#FFFFFF");
  });

  it("scales overlay stops from the default 55%", () => {
    const mid = heroOverlayStops(55);
    expect(mid.bottom).toBeCloseTo(0.55);
    expect(mid.top).toBeCloseTo(0.18);
    expect(photoOverlayBackground(55)).toMatch(/^#[0-9a-f]{6}$/i);
  });
});
