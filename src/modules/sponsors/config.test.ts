import { describe, expect, it } from "vitest";
import {
  EVENT_SPONSOR_TIERS,
  deriveSponsorNameFromFilename,
  groupSponsorsByTier,
  parseSponsorSectionTiers,
  parseSponsorTier,
  sponsorAltText,
  sponsorsToBadgeLogos,
} from "./config";

describe("deriveSponsorNameFromFilename", () => {
  it("humanizes filename stems", () => {
    expect(deriveSponsorNameFromFilename("acme-corp.png")).toBe("Acme Corp");
    expect(deriveSponsorNameFromFilename("global_tech_logo.webp")).toBe(
      "Global Tech Logo",
    );
    expect(deriveSponsorNameFromFilename("IBM.svg")).toBe("IBM");
  });

  it("falls back to Partner", () => {
    expect(deriveSponsorNameFromFilename(".png")).toBe("Partner");
    expect(deriveSponsorNameFromFilename("")).toBe("Partner");
  });
});

describe("sponsorAltText", () => {
  it("uses name or Partner fallback", () => {
    expect(sponsorAltText({ name: "Acme" })).toBe("Acme");
    expect(sponsorAltText({ name: "  " })).toBe("Partner");
  });
});

describe("parseSponsorTier", () => {
  it("accepts known tiers", () => {
    expect(parseSponsorTier("PLATINUM")).toBe("PLATINUM");
    expect(parseSponsorTier("STRATEGIC_PARTNER")).toBe("STRATEGIC_PARTNER");
  });

  it("falls back to gold", () => {
    expect(parseSponsorTier("invalid")).toBe("GOLD");
    expect(parseSponsorTier(null)).toBe("GOLD");
  });
});

describe("groupSponsorsByTier", () => {
  it("groups and sorts sponsors within tiers", () => {
    const groups = groupSponsorsByTier([
      {
        id: "2",
        name: "Beta",
        tier: "GOLD",
        logoUrl: null,
        websiteUrl: null,
        sortOrder: 1,
      },
      {
        id: "1",
        name: "Alpha",
        tier: "GOLD",
        logoUrl: null,
        websiteUrl: null,
        sortOrder: 0,
      },
      {
        id: "3",
        name: "Prime",
        tier: "PLATINUM",
        logoUrl: null,
        websiteUrl: null,
        sortOrder: 0,
      },
    ]);

    expect(groups.map((g) => g.tier)).toEqual([...EVENT_SPONSOR_TIERS]);
    expect(groups.find((g) => g.tier === "PLATINUM")?.sponsors).toHaveLength(1);
    expect(groups.find((g) => g.tier === "GOLD")?.sponsors.map((s) => s.id)).toEqual([
      "1",
      "2",
    ]);
  });
});

describe("sponsorsToBadgeLogos", () => {
  it("includes only sponsors with logos", () => {
    const logos = sponsorsToBadgeLogos([
      {
        id: "a",
        name: "Acme",
        tier: "GOLD",
        logoUrl: "https://example.com/a.png",
        websiteUrl: null,
        sortOrder: 0,
      },
      {
        id: "b",
        name: "No logo",
        tier: "SILVER",
        logoUrl: null,
        websiteUrl: null,
        sortOrder: 0,
      },
    ]);
    expect(logos).toEqual([
      { id: "a", name: "Acme", url: "https://example.com/a.png" },
    ]);
  });
});

describe("parseSponsorSectionTiers", () => {
  it("defaults when invalid", () => {
    expect(parseSponsorSectionTiers(null)).toEqual([
      "PLATINUM",
      "GOLD",
      "SILVER",
      "BRONZE",
    ]);
  });

  it("filters unknown tiers", () => {
    expect(parseSponsorSectionTiers(["GOLD", "CUSTOM", "SILVER"])).toEqual([
      "GOLD",
      "SILVER",
    ]);
  });
});
