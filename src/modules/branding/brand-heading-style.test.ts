import { describe, expect, it } from "vitest";
import {
  parseBrandHeadingAlign,
  parseBrandHeadingEyebrowUppercase,
  parseBrandHeadingFont,
  parseBrandHeadingLineHeight,
  parseBrandHeadingSize,
  parseBrandHeadingTracking,
  parseBrandHeadingWeight,
  parseFocalPercent,
  resolveBrandHeadingStyle,
} from "./brand-heading-style";
import { coverCropFromFocal } from "./cover-focal";

describe("brand heading style", () => {
  it("parses fonts and sizes", () => {
    expect(parseBrandHeadingFont("serif")).toBe("source-serif");
    expect(parseBrandHeadingFont("modern")).toBe("dm-sans");
    expect(parseBrandHeadingFont("manrope")).toBe("manrope");
    expect(parseBrandHeadingFont("nope")).toBe("inter");
    expect(parseBrandHeadingSize("xl")).toBe(72);
    expect(parseBrandHeadingSize("54")).toBe(54);
    expect(parseBrandHeadingSize(60)).toBe(60);
    expect(parseBrandHeadingSize(200)).toBe(120);
    expect(parseBrandHeadingSize(undefined)).toBe(54);
    expect(parseBrandHeadingWeight("medium")).toBe("medium");
    expect(parseBrandHeadingWeight(undefined)).toBe("bold");
    expect(parseBrandHeadingTracking("wide")).toBe("wide");
    expect(parseBrandHeadingTracking(undefined)).toBe("normal");
    expect(parseBrandHeadingAlign("left")).toBe("left");
    expect(parseBrandHeadingAlign(undefined)).toBe("center");
    expect(parseBrandHeadingLineHeight("relaxed")).toBe("relaxed");
    expect(parseBrandHeadingLineHeight(undefined)).toBe("normal");
    expect(parseBrandHeadingEyebrowUppercase("false")).toBe(false);
    expect(parseBrandHeadingEyebrowUppercase(undefined)).toBe(true);
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
      size: 54,
      weight: "bold",
      tracking: "normal",
      align: "center",
      lineHeight: "normal",
      eyebrowUppercase: true,
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

  it("zooms into a smaller crop region", () => {
    const fit = coverCropFromFocal({
      srcWidth: 2000,
      srcHeight: 1000,
      outWidth: 1120,
      outHeight: 1480,
      focalX: 50,
      focalY: 50,
      zoom: 100,
    });
    const zoomed = coverCropFromFocal({
      srcWidth: 2000,
      srcHeight: 1000,
      outWidth: 1120,
      outHeight: 1480,
      focalX: 50,
      focalY: 50,
      zoom: 200,
    });
    expect(zoomed.width).toBeGreaterThan(fit.width);
    expect(zoomed.height).toBeGreaterThan(fit.height);
  });
});
