import { describe, expect, it } from "vitest";
import {
  parseBannerBlur,
  parseEmailHeroBackgroundMode,
  parseEmailHeroGradientStyle,
  parseHeroBlur,
} from "./invite-hero-background";

describe("invite hero background", () => {
  it("parses background modes", () => {
    expect(parseEmailHeroBackgroundMode("IMAGE")).toBe("IMAGE");
    expect(parseEmailHeroBackgroundMode("GRADIENT")).toBe("GRADIENT");
    expect(parseEmailHeroBackgroundMode("nope")).toBe("COLOR");
  });

  it("parses gradient styles", () => {
    expect(parseEmailHeroGradientStyle("violet")).toBe("violet");
    expect(parseEmailHeroGradientStyle(undefined)).toBe("indigo");
  });

  it("clamps blur values", () => {
    expect(parseBannerBlur(undefined, 0)).toBe(0);
    expect(parseBannerBlur("12", 0)).toBe(12);
    expect(parseBannerBlur(99, 0)).toBe(24);
    expect(parseHeroBlur(-3, 6)).toBe(0);
    expect(parseHeroBlur("6", 6)).toBe(6);
  });
});
