import { describe, expect, it } from "vitest";
import {
  parseBrandHeadingFont,
  parseBrandHeadingSize,
  parseFocalPercent,
  resolveBrandHeadingStyle,
} from "./brand-heading-style";
import { coverCropFromFocal } from "./cover-focal";

describe("brand heading style", () => {
  it("parses fonts and sizes", () => {
    expect(parseBrandHeadingFont("serif")).toBe("serif");
    expect(parseBrandHeadingFont("nope")).toBe("inter");
    expect(parseBrandHeadingSize("lg")).toBe("lg");
    expect(parseBrandHeadingSize(undefined)).toBe("md");
  });

  it("clamps focal percents", () => {
    expect(parseFocalPercent(-10)).toBe(0);
    expect(parseFocalPercent(150)).toBe(100);
    expect(parseFocalPercent("33")).toBe(33);
  });

  it("resolves defaults", () => {
    expect(resolveBrandHeadingStyle({})).toEqual({
      color: null,
      font: "inter",
      size: "md",
    });
  });
});

describe("coverCropFromFocal", () => {
  it("shifts crop toward the focal point", () => {
    const center = coverCropFromFocal({
      srcWidth: 2000,
      srcHeight: 1000,
      outWidth: 1120,
      outHeight: 1480,
      focalX: 50,
      focalY: 50,
    });
    const right = coverCropFromFocal({
      srcWidth: 2000,
      srcHeight: 1000,
      outWidth: 1120,
      outHeight: 1480,
      focalX: 100,
      focalY: 50,
    });
    expect(right.left).toBeGreaterThan(center.left);
  });
});
