import { describe, expect, it } from "vitest";
import {
  EVENT_PERMISSIONS,
  ORG_PERMISSIONS,
  hasPermission,
  resolveEventAccess,
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

describe("resolveEventAccess", () => {
  it("lets organisation admins keep full event access even with a staff role", () => {
    const resolved = resolveEventAccess({
      platformAdmin: false,
      orgRole: "ADMIN",
      eventRole: "CHECKIN_STAFF",
      permission: "invitees.write",
    });
    expect(resolved?.via).toBe("org");
    expect(resolved?.grants).toEqual(ORG_PERMISSIONS.ADMIN);
  });

  it("applies check-in staff grants when the user has no org membership", () => {
    const allowed = resolveEventAccess({
      platformAdmin: false,
      orgRole: null,
      eventRole: "CHECKIN_STAFF",
      permission: "checkin.perform",
    });
    expect(allowed?.via).toBe("event");
    expect(allowed?.grants).toEqual(EVENT_PERMISSIONS.CHECKIN_STAFF);

    const denied = resolveEventAccess({
      platformAdmin: false,
      orgRole: null,
      eventRole: "CHECKIN_STAFF",
      permission: "invitees.write",
    });
    expect(denied).toBeNull();
  });

  it("scopes registration managers away from check-in", () => {
    expect(
      resolveEventAccess({
        platformAdmin: false,
        orgRole: null,
        eventRole: "REGISTRATION_MANAGER",
        permission: "registrations.write",
      })?.via,
    ).toBe("event");
    expect(
      resolveEventAccess({
        platformAdmin: false,
        orgRole: null,
        eventRole: "REGISTRATION_MANAGER",
        permission: "checkin.perform",
      }),
    ).toBeNull();
  });
});
