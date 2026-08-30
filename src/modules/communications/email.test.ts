import { describe, expect, it } from "vitest";
import { letter, OUTBOUND_EMAIL_TEMPLATES } from "./email-layout";
import { emailHtmlIncludesUnsubscribe } from "./email-unsubscribe";

describe("outbound email templates", () => {
  it("lists every send* entry point", () => {
    expect(OUTBOUND_EMAIL_TEMPLATES).toHaveLength(10);
    expect(OUTBOUND_EMAIL_TEMPLATES).toContain("sendInvitationEmail");
    expect(OUTBOUND_EMAIL_TEMPLATES).toContain("sendRegistrationConfirmationEmail");
    expect(OUTBOUND_EMAIL_TEMPLATES).toContain("sendApplicationDecisionEmail");
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
    });

    expect(html).toContain("Unsubscribe");
    expect(html).toContain("Privacy");
    expect(html).toContain("Terms");
    expect(html).toContain("unsubscribe at any time");
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
});
