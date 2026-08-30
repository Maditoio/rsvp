import { describe, expect, it } from "vitest";
import {
  parseEventSiteConfig,
  DEFAULT_EVENT_SITE_CONFIG,
  eventSiteConfigFromEvent,
  buildDefaultConfig,
  getPrimaryCta,
  applyTemplateToConfig,
} from "./config";
import {
  getEventSiteTemplate,
  listEventSiteTemplates,
  parseTemplateId,
} from "./templates";
import { parseSiteHexColor } from "./theme";

describe("event site templates", () => {
  it("lists five professional templates", () => {
    const templates = listEventSiteTemplates();
    expect(templates).toHaveLength(5);
    expect(templates.map((t) => t.id)).toEqual([
      "executive-summit",
      "global-conference",
      "investment-forum",
      "modern-conference",
      "government-institutional",
    ]);
  });

  it("maps legacy template ids", () => {
    expect(parseTemplateId("summit")).toBe("executive-summit");
    expect(parseTemplateId("conference")).toBe("global-conference");
    expect(parseTemplateId("minimal")).toBe("modern-conference");
  });

  it("falls back to executive-summit for unknown ids", () => {
    expect(getEventSiteTemplate("unknown").id).toBe("executive-summit");
  });
});

describe("parseEventSiteConfig", () => {
  it("returns v2 defaults for invalid input", () => {
    const parsed = parseEventSiteConfig(null);
    expect(parsed.schemaVersion).toBe(2);
    expect(parsed.sections.length).toBeGreaterThan(0);
  });

  it("migrates legacy v1 config to sections", () => {
    const parsed = parseEventSiteConfig({
      templateId: "conference",
      theme: { accentColor: "#4338CA", heroColor: "#0F172A" },
      hero: { headline: "Africa Summit 2026", enabled: true },
      about: { body: "About text", enabled: true },
      speakers: {
        enabled: true,
        items: [{ id: "1", name: "Jane Doe", title: "CEO", company: "Acme" }],
      },
      cta: { type: "external", label: "Buy tickets", externalUrl: "https://example.com" },
    });
    expect(parsed.templateId).toBe("global-conference");
    expect(parsed.schemaVersion).toBe(2);
    expect(parsed.sections.some((s) => s.type === "hero")).toBe(true);
    const hero = parsed.sections.find((s) => s.type === "hero");
    expect(hero?.content.headline).toBe("Africa Summit 2026");
    const speakers = parsed.sections.find((s) => s.type === "speakers");
    const items = speakers?.content.items as { firstName: string; lastName: string }[];
    expect(items[0]?.firstName).toBe("Jane");
    expect(items[0]?.lastName).toBe("Doe");
  });

  it("parses v2 config with theme presets", () => {
    const parsed = parseEventSiteConfig({
      schemaVersion: 2,
      templateId: "investment-forum",
      theme: {
        preset: "elegant",
        primaryColor: "#1C1917",
        secondaryColor: "#57534E",
        accentColor: "#92400E",
        backgroundColor: "#FFFBEB",
        textColor: "#57534E",
        headingFont: "playfair",
        bodyFont: "merriweather",
      },
      globalStyles: {
        buttonStyle: "outline",
        borderRadius: "sm",
        sectionSpacing: "normal",
        containerWidth: "default",
        navStyle: "sticky-light",
      },
      sections: buildDefaultConfig("investment-forum").sections,
      seo: { title: "Summit", description: "Desc", ogImage: null, keywords: [] },
    });
    expect(parsed.templateId).toBe("investment-forum");
    expect(parsed.theme.preset).toBe("elegant");
    expect(parsed.theme.headingFont).toBe("playfair");
  });

  it("normalizes short hex colours", () => {
    const parsed = parseEventSiteConfig({
      schemaVersion: 2,
      sections: DEFAULT_EVENT_SITE_CONFIG.sections,
      theme: { accentColor: "#f00" },
    });
    expect(parsed.theme.accentColor).toBe("#FF0000");
  });
});

describe("eventSiteConfigFromEvent", () => {
  it("prefills hero and about from event fields when empty", () => {
    const base = buildDefaultConfig();
    const config = eventSiteConfigFromEvent({
      name: "Mining Summit",
      description: "A flagship mining event.",
      venue: "Cape Town",
      logoUrl: "https://example.com/logo.png",
      config: base,
    });
    const hero = config.sections.find((s) => s.type === "hero");
    expect(hero?.content.headline).toBe("Mining Summit");
    expect(hero?.content.subheadline).toBe("A flagship mining event.");
    expect(hero?.content.imageUrl).toBeNull();
    const about = config.sections.find((s) => s.type === "about");
    expect(about?.content.body).toBe("A flagship mining event.");
  });
});

describe("getPrimaryCta", () => {
  it("reads CTA from registration-cta section", () => {
    const config = buildDefaultConfig();
    const sections = config.sections.map((s) =>
      s.type === "registration-cta"
        ? {
            ...s,
            content: {
              ...s.content,
              ctaType: "external",
              ctaLabel: "Tickets",
              externalUrl: "https://tickets.example.com",
            },
          }
        : s,
    );
    const cta = getPrimaryCta({ ...config, sections });
    expect(cta.type).toBe("external");
    expect(cta.label).toBe("Tickets");
    expect(cta.externalUrl).toBe("https://tickets.example.com");
  });
});

describe("applyTemplateToConfig", () => {
  it("preserves existing section content when switching templates", () => {
    const config = buildDefaultConfig("executive-summit");
    const withHeadline = {
      ...config,
      sections: config.sections.map((s) =>
        s.type === "hero"
          ? { ...s, content: { ...s.content, headline: "Custom headline" } }
          : s,
      ),
    };
    const next = applyTemplateToConfig(withHeadline, "global-conference");
    expect(next.templateId).toBe("global-conference");
    const hero = next.sections.find((s) => s.type === "hero");
    expect(hero?.content.headline).toBe("Custom headline");
  });
});

describe("parseSiteHexColor", () => {
  it("rejects invalid colours", () => {
    expect(parseSiteHexColor("red", "#4F46E5")).toBe("#4F46E5");
  });
});
