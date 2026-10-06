import { describe, expect, it } from "vitest";
import {
  accentFromWebsiteConfig,
  emailSafeLogoUrl,
  parseEmailHexColor,
  resolveEmailBranding,
} from "./email-branding";

describe("email branding", () => {
  it("normalises 3-digit hex colours", () => {
    expect(parseEmailHexColor("#f00")).toBe("#FF0000");
  });

  it("rejects SVG logos for email clients", () => {
    expect(emailSafeLogoUrl("https://cdn.example.com/logo.svg")).toBeNull();
    expect(emailSafeLogoUrl("https://cdn.example.com/logo.png")).toBe(
      "https://cdn.example.com/logo.png",
    );
  });

  it("reads accent colour from website config when email accent is unset", () => {
    expect(
      accentFromWebsiteConfig({ theme: { accentColor: "#0D9488" } }),
    ).toBe("#0D9488");
  });

  it("prefers explicit email accent over website theme", () => {
    const branding = resolveEmailBranding({
      logoUrl: "https://cdn.example.com/logo.png",
      emailAccentColor: "#92400E",
      websiteConfig: { theme: { accentColor: "#0D9488" } },
    });
    expect(branding.logoUrl).toBe("https://cdn.example.com/logo.png");
    expect(branding.bannerUrl).toBeNull();
    expect(branding.accentColor).toBe("#92400E");
    expect(branding.accentSoft).not.toBe("#EEF2FF");
  });

  it("accepts banner without logo", () => {
    const branding = resolveEmailBranding({
      bannerUrl: "https://cdn.example.com/banner.jpg",
    });
    expect(branding.logoUrl).toBeNull();
    expect(branding.bannerUrl).toBe("https://cdn.example.com/banner.jpg");
  });

  it("rejects SVG banners", () => {
    expect(
      resolveEmailBranding({
        bannerUrl: "https://cdn.example.com/banner.svg",
      }).bannerUrl,
    ).toBeNull();
  });

  it("uses composed hero image when overlay is enabled", () => {
    const branding = resolveEmailBranding({
      logoUrl: "https://cdn.example.com/logo.png",
      bannerUrl: "https://cdn.example.com/banner.jpg",
      heroOverlayEnabled: true,
      heroImageUrl: "https://cdn.example.com/invite-hero.png",
    });
    expect(branding.heroCard).toBe(true);
    expect(branding.bannerUrl).toBe("https://cdn.example.com/invite-hero.png");
    expect(branding.logoUrl).toBeNull();
  });

  it("ignores hero image when overlay is disabled", () => {
    const branding = resolveEmailBranding({
      bannerUrl: "https://cdn.example.com/banner.jpg",
      heroOverlayEnabled: false,
      heroImageUrl: "https://cdn.example.com/invite-hero.png",
    });
    expect(branding.heroCard).toBeFalsy();
    expect(branding.bannerUrl).toBe("https://cdn.example.com/banner.jpg");
  });
});
