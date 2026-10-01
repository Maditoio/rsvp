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
    expect(branding.accentColor).toBe("#92400E");
    expect(branding.accentSoft).not.toBe("#EEF2FF");
  });
});
