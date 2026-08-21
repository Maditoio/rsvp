import { describe, expect, it } from "vitest";
import { MICROSOFT_OAUTH_SCOPES } from "@/modules/calendar/microsoft";

describe("Microsoft OAuth scopes for Teams", () => {
  it("includes calendar and online meetings delegated scopes", () => {
    expect(MICROSOFT_OAUTH_SCOPES).toContain("Calendars.ReadWrite");
    expect(MICROSOFT_OAUTH_SCOPES).toContain("OnlineMeetings.ReadWrite");
    expect(MICROSOFT_OAUTH_SCOPES).toContain("offline_access");
    expect(MICROSOFT_OAUTH_SCOPES.join(" ")).not.toMatch(
      /OnlineMeetings\.ReadWrite\.All/,
    );
  });
});
