import { describe, expect, it } from "vitest";
import {
  buildListUnsubscribeHeaders,
  buildUnsubscribeUrl,
  emailHtmlIncludesUnsubscribe,
  normalizeRecipientEmail,
} from "./email-unsubscribe";

describe("email unsubscribe helpers", () => {
  it("normalizes recipient email", () => {
    expect(normalizeRecipientEmail("  User@Example.COM ")).toBe("user@example.com");
  });

  it("builds unsubscribe URL with encoded email", () => {
    const url = buildUnsubscribeUrl("user@example.com");
    expect(url).toContain("/unsubscribe?email=");
    expect(url).toContain(encodeURIComponent("user@example.com"));
  });

  it("builds List-Unsubscribe headers for one-click support", () => {
    const headers = buildListUnsubscribeHeaders("user@example.com");
    expect(headers["List-Unsubscribe"]).toContain("/unsubscribe?email=");
    expect(headers["List-Unsubscribe-Post"]).toBe("List-Unsubscribe=One-Click");
  });

  it("detects unsubscribe link in HTML", () => {
    const email = "user@example.com";
    const html = `<a href="${buildUnsubscribeUrl(email)}">Unsubscribe</a>`;
    expect(emailHtmlIncludesUnsubscribe(html, email)).toBe(true);
    expect(emailHtmlIncludesUnsubscribe("<p>No link</p>", email)).toBe(false);
  });
});
