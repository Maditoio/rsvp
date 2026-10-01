import { afterEach, describe, expect, it } from "vitest";
import { bareEmailAddress, formatOutboundFrom } from "./email-from";

describe("outbound from / reply-to formatting", () => {
  const originalFrom = process.env.RESEND_FROM_EMAIL;

  afterEach(() => {
    if (originalFrom === undefined) {
      delete process.env.RESEND_FROM_EMAIL;
    } else {
      process.env.RESEND_FROM_EMAIL = originalFrom;
    }
  });

  it("strips display-name wrappers from addresses", () => {
    expect(bareEmailAddress('"support@bizconrsvp.com" <support@bizconrsvp.com>')).toBe(
      "support@bizconrsvp.com",
    );
    expect(bareEmailAddress("Bizcon RSVP <invites@bizconrsvp.com>")).toBe(
      "invites@bizconrsvp.com",
    );
    expect(bareEmailAddress("support@bizconrsvp.com")).toBe("support@bizconrsvp.com");
  });

  it("builds From as host via Bizcon RSVP", () => {
    process.env.RESEND_FROM_EMAIL = "Bizcon RSVP <invites@bizconrsvp.com>";
    expect(formatOutboundFrom("FS Systems")).toBe(
      '"FS Systems via Bizcon RSVP" <invites@bizconrsvp.com>',
    );
    expect(formatOutboundFrom(null)).toBe("Bizcon RSVP <invites@bizconrsvp.com>");
  });
});
