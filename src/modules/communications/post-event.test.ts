import { describe, expect, it } from "vitest";
import {
  assertEventEligibleForPostEvent,
  audienceLabel,
  audienceStatusFilter,
  defaultPostEventSubject,
  parsePostEventAudience,
  renderPostEventBodyHtml,
  toPostEventAudienceEnum,
} from "./post-event";
import { escapeHtml, p } from "./email-layout";

describe("post-event audience helpers", () => {
  it("parses and maps audience values", () => {
    expect(parsePostEventAudience("checked_in")).toBe("checked_in");
    expect(toPostEventAudienceEnum("registered")).toBe("REGISTERED");
    expect(audienceStatusFilter("checked_in")).toEqual(["CHECKED_IN"]);
    expect(audienceStatusFilter("registered")).toEqual([
      "REGISTERED",
      "CONFIRMED",
      "CHECKED_IN",
    ]);
    expect(audienceStatusFilter("registered_not_checked_in")).toEqual([
      "REGISTERED",
      "CONFIRMED",
    ]);
    expect(audienceLabel("CHECKED_IN")).toBe("Checked in");
  });

  it("rejects unknown audience values", () => {
    expect(() => parsePostEventAudience("everyone")).toThrow(
      /Invalid post-event audience/,
    );
  });
});

describe("post-event eligibility", () => {
  it("requires an end (or start) date in the past", () => {
    const now = new Date("2026-10-02T12:00:00Z");
    expect(() =>
      assertEventEligibleForPostEvent({
        startsAt: null,
        endsAt: null,
        now,
      }),
    ).toThrow(/end date/);

    expect(() =>
      assertEventEligibleForPostEvent({
        startsAt: new Date("2026-10-03T12:00:00Z"),
        endsAt: null,
        now,
      }),
    ).toThrow(/after the event end/);

    expect(() =>
      assertEventEligibleForPostEvent({
        startsAt: new Date("2026-09-01T12:00:00Z"),
        endsAt: new Date("2026-09-02T18:00:00Z"),
        now,
      }),
    ).not.toThrow();
  });
});

describe("post-event body rendering", () => {
  it("escapes HTML and preserves paragraphs", () => {
    const html = renderPostEventBodyHtml(
      'Thanks for coming.\n\nSee <script>alert(1)</script> soon.',
      escapeHtml,
      p,
    );
    expect(html).toContain("Thanks for coming.");
    expect(html).toContain("&lt;script&gt;");
    expect(html).not.toContain("<script>");
    expect(defaultPostEventSubject("Summit")).toBe(
      "Thank you for attending Summit",
    );
  });
});
