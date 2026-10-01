import { describe, expect, it } from "vitest";
import { resolveEmailBranding } from "./email-branding";
import {
  eventMailContextFromSnapshot,
  eventMailContextToSnapshot,
  resolveMailContextFromPartial,
} from "./email-mail-snapshot";

describe("event mail snapshot", () => {
  it("round-trips snapshots without losing branding", () => {
    const branding = resolveEmailBranding({
      logoUrl: "https://cdn.example.com/logo.png",
      bannerUrl: "https://cdn.example.com/banner.jpg",
      emailAccentColor: "#0D9488",
    });
    const ctx = {
      eventName: "Summit",
      orgName: "Acme",
      venue: "Hall A",
      timezone: "Africa/Johannesburg",
      startsAt: new Date("2026-11-01T08:00:00.000Z"),
      endsAt: new Date("2026-11-01T17:00:00.000Z"),
      description: "Annual summit",
      branding,
    };
    const restored = eventMailContextFromSnapshot(
      eventMailContextToSnapshot(ctx),
    );
    expect(restored.eventName).toBe("Summit");
    expect(restored.startsAt?.toISOString()).toBe(ctx.startsAt.toISOString());
    expect(restored.branding.bannerUrl).toBe(
      "https://cdn.example.com/banner.jpg",
    );
    expect(restored.branding.accentColor).toBe("#0D9488");
  });

  it("resolves from a mail snapshot without needing the database", () => {
    const branding = resolveEmailBranding({
      bannerUrl: "https://cdn.example.com/banner.jpg",
    });
    const mail = eventMailContextToSnapshot({
      eventName: "From snapshot",
      orgName: "Org",
      venue: null,
      timezone: "UTC",
      startsAt: null,
      endsAt: null,
      description: null,
      branding,
    });

    const ctx = resolveMailContextFromPartial({ mail });
    expect(ctx?.eventName).toBe("From snapshot");
    expect(ctx?.branding.bannerUrl).toBe("https://cdn.example.com/banner.jpg");
  });
});
