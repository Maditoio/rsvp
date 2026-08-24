import { describe, expect, it } from "vitest";
import {
  parseBadgeConfig,
  DEFAULT_BADGE_CONFIG,
  applyDesignPreset,
  selectedSponsors,
} from "./config";
import { getBadgeTemplate, listBadgeTemplates } from "./templates";
import { listBadgeDesigns, getBadgeDesign } from "./designs";

describe("badge templates", () => {
  it("lists standard printer templates", () => {
    const templates = listBadgeTemplates();
    expect(templates.length).toBeGreaterThanOrEqual(5);
    expect(templates.some((t) => t.id === "zebra_4x3")).toBe(true);
    expect(templates.some((t) => t.id === "dymo_30256")).toBe(true);
    expect(templates.some((t) => t.id === "cr80_lanyard")).toBe(true);
  });

  it("falls back to zebra 4x3 for unknown ids", () => {
    expect(getBadgeTemplate("unknown").id).toBe("zebra_4x3");
  });
});

describe("badge designs", () => {
  it("lists layout presets", () => {
    const designs = listBadgeDesigns();
    expect(designs.length).toBeGreaterThanOrEqual(5);
    expect(getBadgeDesign("qr_left").qrPosition).toBe("left");
    expect(getBadgeDesign("sponsor_header").sponsorPosition).toBe("top");
  });
});

describe("parseBadgeConfig", () => {
  it("returns defaults for invalid input", () => {
    expect(parseBadgeConfig(null)).toEqual(DEFAULT_BADGE_CONFIG);
  });

  it("migrates legacy configs", () => {
    const parsed = parseBadgeConfig({
      templateId: "avery_5392",
      showJobTitle: false,
      showCategory: true,
    });
    expect(parsed.templateId).toBe("avery_5392");
    expect(parsed.showJobTitle).toBe(false);
    expect(parsed.designId).toBe("classic");
    expect(parsed.qrPosition).toBe("right");
  });

  it("parses full config with sponsors", () => {
    const parsed = parseBadgeConfig({
      templateId: "zebra_4x3",
      designId: "sponsor_footer",
      showJobTitle: true,
      showCategory: true,
      showEventLogo: true,
      eventLogoPosition: "top",
      qrPosition: "left",
      qrSize: "sm",
      sponsorPosition: "bottom",
      selectedSponsorIds: ["a"],
      sponsors: [
        { id: "a", name: "Acme", url: "https://example.com/a.png" },
        { id: "b", name: "Beta", url: "https://example.com/b.png" },
      ],
    });
    expect(parsed.selectedSponsorIds).toEqual(["a"]);
    expect(selectedSponsors(parsed)).toHaveLength(1);
    expect(selectedSponsors(parsed)[0]?.name).toBe("Acme");
  });
});

describe("applyDesignPreset", () => {
  it("copies design positions onto config", () => {
    const next = applyDesignPreset(DEFAULT_BADGE_CONFIG, "side_rail");
    expect(next.designId).toBe("side_rail");
    expect(next.eventLogoPosition).toBe("left");
    expect(next.qrPosition).toBe("right");
    expect(next.qrPx).toBe(56);
  });
});
