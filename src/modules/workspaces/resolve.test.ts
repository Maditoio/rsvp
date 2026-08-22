import { describe, expect, it } from "vitest";
import { matchWorkspaceFromPath } from "./match-path";
import type { UserWorkspace } from "./types";

const sampleWorkspaces: UserWorkspace[] = [
  {
    id: "attendee",
    kind: "attendee",
    label: "Attendee portal",
    description: "Events",
    href: "/me",
  },
  {
    id: "organiser:acme",
    kind: "organiser",
    label: "Acme",
    description: "Organiser",
    href: "/app/acme",
    meta: { orgSlug: "acme" },
  },
  {
    id: "event_ops:evt1:CHECKIN_STAFF",
    kind: "event_operations",
    label: "Summit",
    description: "Check-in",
    href: "/app/acme/events/evt1/day",
    meta: { orgSlug: "acme", eventId: "evt1", eventRole: "CHECKIN_STAFF" },
  },
  {
    id: "platform",
    kind: "platform",
    label: "Platform",
    description: "Admin",
    href: "/platform",
  },
];

describe("matchWorkspaceFromPath", () => {
  it("matches attendee routes", () => {
    expect(matchWorkspaceFromPath("/me", sampleWorkspaces)?.id).toBe("attendee");
    expect(matchWorkspaceFromPath("/me/events/x/directory", sampleWorkspaces)?.id).toBe(
      "attendee",
    );
  });

  it("matches organiser routes", () => {
    expect(matchWorkspaceFromPath("/app/acme", sampleWorkspaces)?.id).toBe(
      "organiser:acme",
    );
  });

  it("matches event operations routes", () => {
    expect(
      matchWorkspaceFromPath("/app/acme/events/evt1/day", sampleWorkspaces)?.id,
    ).toBe("event_ops:evt1:CHECKIN_STAFF");
    expect(
      matchWorkspaceFromPath("/app/acme/events/evt1/day/lookup", sampleWorkspaces)?.id,
    ).toBe("event_ops:evt1:CHECKIN_STAFF");
  });

  it("matches platform routes", () => {
    expect(matchWorkspaceFromPath("/platform", sampleWorkspaces)?.id).toBe("platform");
  });
});
