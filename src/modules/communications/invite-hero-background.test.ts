import { describe, expect, it } from "vitest";
import {
  parseEmailHeroBackgroundMode,
  parseEmailHeroGradientStyle,
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
});
