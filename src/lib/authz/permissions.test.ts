import { describe, expect, it } from "vitest";
import {
  EVENT_PERMISSIONS,
  ORG_PERMISSIONS,
  hasPermission,
} from "./permissions";

describe("event and organisation permissions", () => {
  it("does not grant check-in staff attendee emails, reports, or invitation writes", () => {
    const staff = EVENT_PERMISSIONS.CHECKIN_STAFF;
    expect(staff).toEqual(["event.read", "checkin.perform"]);
    expect(hasPermission(staff, "attendees.read")).toBe(false);
    expect(hasPermission(staff, "attendees.write")).toBe(false);
    expect(hasPermission(staff, "reports.export")).toBe(false);
    expect(hasPermission(staff, "registrations.read")).toBe(false);
    expect(hasPermission(staff, "invitees.write")).toBe(false);
  });

  it("grants organisation owners event.create", () => {
    expect(ORG_PERMISSIONS.OWNER).toContain("event.create");
    expect(hasPermission(ORG_PERMISSIONS.OWNER, "event.create")).toBe(true);
  });
});
