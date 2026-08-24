import { describe, expect, it } from "vitest";
import {
  badgeEventLogoStyle,
  badgeQrStyle,
  clampBadgeSize,
  migrateQrPx,
  parseBadgeSize,
} from "./sizing";
import {
  parseBadgeConfig,
  DEFAULT_BADGE_CONFIG,
  applyDesignPreset,
  getLayoutPreset,
} from "./config";
import {
  contrastRatio,
  parseHexColor,
  qrColorsAreScannable,
} from "./colors";
import { moveLayoutElement } from "./layout";

describe("badge sizing", () => {
  it("clamps values to 0–500", () => {
    expect(clampBadgeSize(-10)).toBe(0);
    expect(clampBadgeSize(600)).toBe(500);
    expect(clampBadgeSize(42.6)).toBe(43);
  });

  it("parses legacy enum levels into px", () => {
    expect(parseBadgeSize("md", 18, 18)).toBe(18);
    expect(parseBadgeSize("xl", 18, 18)).toBe(Math.round(18 * 1.25));
    expect(parseBadgeSize("120", 18)).toBe(120);
  });

  it("migrates legacy qrSize + qrScale to qrPx", () => {
    expect(migrateQrPx({ qrSize: "sm", qrScale: "2xl" })).toBe(
      Math.round(40 * 1.5),
    );
    expect(migrateQrPx({ qrPx: 90 })).toBe(90);
  });

  it("builds logo and qr styles from px", () => {
    expect(badgeEventLogoStyle("top", 32).maxHeight).toBe("32px");
    expect(badgeQrStyle(80)).toEqual({ width: 80, height: 80 });
  });
});

describe("badge colours", () => {
  it("normalises hex colours", () => {
    expect(parseHexColor("#abc", "#000000")).toBe("#AABBCC");
    expect(parseHexColor("nope", "#4F46E5")).toBe("#4F46E5");
  });

  it("checks QR contrast", () => {
    expect(qrColorsAreScannable("#1B1E2A", "#FFFFFF")).toBe(true);
    expect(contrastRatio("#FFFFFF", "#FFFFFF")).toBe(1);
    expect(qrColorsAreScannable("#EEEEEE", "#FFFFFF")).toBe(false);
  });
});

describe("badge layout canvas", () => {
  it("moves elements within 0–100%", () => {
    const next = moveLayoutElement(getLayoutPreset("classic"), "qr", 12.34, 200);
    expect(next.qr.x).toBe(12.3);
    expect(next.qr.y).toBe(100);
  });
});

describe("parseBadgeConfig numeric migration", () => {
  it("migrates old discrete size levels and fills layout", () => {
    const parsed = parseBadgeConfig({
      templateId: "zebra_4x3",
      nameSize: "lg",
      qrSize: "md",
      qrScale: "xl",
      showCountry: true,
    });
    expect(parsed.nameSize).toBe(Math.round(18 * 1.125));
    expect(parsed.qrPx).toBe(Math.round(56 * 1.25));
    expect(parsed.showCountry).toBe(true);
    expect(parsed.layout.qr).toBeTruthy();
    expect(parsed.nameColor).toBe(DEFAULT_BADGE_CONFIG.nameColor);
  });

  it("accepts numeric sizes, colours, and layout", () => {
    const parsed = parseBadgeConfig({
      nameSize: 42,
      qrPx: 100,
      nameColor: "#4F46E5",
      nameFill: "gradient",
      layout: getLayoutPreset("qr_left"),
    });
    expect(parsed.nameSize).toBe(42);
    expect(parsed.qrPx).toBe(100);
    expect(parsed.nameColor).toBe("#4F46E5");
    expect(parsed.nameFill).toBe("gradient");
    expect(parsed.layout.qr.x).toBe(getLayoutPreset("qr_left").qr.x);
  });
});

describe("applyDesignPreset", () => {
  it("applies canvas layout for the design", () => {
    const next = applyDesignPreset(DEFAULT_BADGE_CONFIG, "side_rail");
    expect(next.designId).toBe("side_rail");
    expect(next.layout.eventLogo.x).toBe(getLayoutPreset("side_rail").eventLogo.x);
    expect(next.qrPx).toBe(56);
  });
});
