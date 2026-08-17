import { describe, expect, it } from "vitest";
import {
  EVENT_PERMISSIONS,
  ORG_PERMISSIONS,
  hasPermission,
} from "./permissions";

describe("event and organisation permissions", () => {
  it("does not grant check-in staff invitees.write", () => {
    expect(EVENT_PERMISSIONS.CHECKIN_STAFF).not.toContain("invitees.write");
    expect(hasPermission(EVENT_PERMISSIONS.CHECKIN_STAFF, "invitees.write")).toBe(
      false,
    );
  });

  it("grants organisation owners event.create", () => {
    expect(ORG_PERMISSIONS.OWNER).toContain("event.create");
    expect(hasPermission(ORG_PERMISSIONS.OWNER, "event.create")).toBe(true);
  });
});
