import { describe, expect, it } from "vitest";
import { letter, OUTBOUND_EMAIL_TEMPLATES } from "./email-layout";
import { emailHtmlIncludesUnsubscribe } from "./email-unsubscribe";
import { resolveEmailBranding } from "./email-branding";

describe("outbound email templates", () => {
  it("lists every send* entry point", () => {
    expect(OUTBOUND_EMAIL_TEMPLATES).toHaveLength(11);
    expect(OUTBOUND_EMAIL_TEMPLATES).toContain("sendInvitationEmail");
    expect(OUTBOUND_EMAIL_TEMPLATES).toContain("sendRegistrationConfirmationEmail");
    expect(OUTBOUND_EMAIL_TEMPLATES).toContain("sendApplicationDecisionEmail");
    expect(OUTBOUND_EMAIL_TEMPLATES).toContain("sendPostEventFollowUpEmail");
  });

  it("includes visible unsubscribe link and footer copy in the shared letter shell", () => {
    const toEmail = "attendee@example.com";
    const html = letter({
      title: "Sample event",
      eyebrow: "Test",
      body: "<p>Body copy</p>",
      orgName: "Acme Events",
      toEmail,
      href: "https://example.com/invite",
      cta: "Open",
      footerKind: "invitation",
    });

    expect(html).toContain("Unsubscribe");
    expect(html).toContain("Privacy");
    expect(html).toContain("Terms");
    expect(html).toContain("You were invited by");
    expect(html).toContain("Acme Events");
    expect(html).toContain("Bizcon RSVP");
    expect(html).toContain("Questions? Contact");
    expect(html).not.toContain("signed up for or have recently used");
    expect(html).not.toContain("projects and subscription");
    expect(html).not.toContain("secure link");
    expect(emailHtmlIncludesUnsubscribe(html, toEmail)).toBe(true);
  });

  it("includes unsubscribe when letter has no primary CTA", () => {
    const toEmail = "staff@example.com";
    const html = letter({
      title: "Role update",
      eyebrow: "Staff access",
      body: "<p>Your role changed.</p>",
      orgName: "Acme Events",
      toEmail,
    });

    expect(html).toContain("Unsubscribe");
    expect(emailHtmlIncludesUnsubscribe(html, toEmail)).toBe(true);
  });

  it("renders event logo and brand accent when branding is provided", () => {
    const branding = resolveEmailBranding({
      logoUrl: "https://cdn.example.com/logo.png",
      emailAccentColor: "#0D9488",
    });
    const html = letter({
      title: "Summit invite",
      eyebrow: "Invitation",
      body: "<p>Hello</p>",
      orgName: "Acme Events",
      toEmail: "guest@example.com",
      href: "https://example.com/i/x",
      cta: "View invitation",
      branding,
    });

    expect(html).toContain('src="https://cdn.example.com/logo.png"');
    expect(html).toContain("background:#0D9488");
    expect(html).not.toContain("Powered by Bizcon RSVP");
  });

  it("renders banner alone or with logo", () => {
    const bannerOnly = resolveEmailBranding({
      bannerUrl: "https://cdn.example.com/banner.jpg",
    });
    const both = resolveEmailBranding({
      logoUrl: "https://cdn.example.com/logo.png",
      bannerUrl: "https://cdn.example.com/banner.jpg",
    });

    const bannerHtml = letter({
      title: "Summit",
      eyebrow: "Invitation",
      body: "<p>Hi</p>",
      orgName: "Acme",
      toEmail: "a@example.com",
      branding: bannerOnly,
    });
    expect(bannerHtml).toContain('src="https://cdn.example.com/banner.jpg"');
    expect(bannerHtml).not.toContain('src="https://cdn.example.com/logo.png"');

    const bothHtml = letter({
      title: "Summit",
      eyebrow: "Invitation",
      body: "<p>Hi</p>",
      orgName: "Acme",
      toEmail: "a@example.com",
      branding: both,
    });
    expect(bothHtml).toContain('src="https://cdn.example.com/banner.jpg"');
    expect(bothHtml).toContain('src="https://cdn.example.com/logo.png"');
  });
});
