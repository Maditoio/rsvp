import { describe, expect, it } from "vitest";
import { buildPlatformSurfaceCatalog } from "./surfaces";

describe("buildPlatformSurfaceCatalog", () => {
  it("includes global, org, event role, and attendee routes", () => {
    const groups = buildPlatformSurfaceCatalog({
      organisations: [{ slug: "acme", name: "Acme Events" }],
      events: [
        {
          id: "evt_1",
          name: "Summit 2026",
          organisation: { slug: "acme", name: "Acme Events" },
        },
      ],
    });

    expect(groups.some((g) => g.id === "global")).toBe(true);
    expect(groups.some((g) => g.id === "org:acme")).toBe(true);
    expect(groups.some((g) => g.id === "event_roles:evt_1")).toBe(true);
    expect(groups.some((g) => g.id === "event_attendee:evt_1")).toBe(true);

    expect(groups.some((g) => g.id === "event_day:evt_1")).toBe(true);

    const dayGroup = groups.find((g) => g.id === "event_day:evt_1");
    expect(dayGroup?.links.some((l) => l.href.endsWith("/day"))).toBe(true);
    expect(dayGroup?.links.some((l) => l.href.endsWith("/day/lookup"))).toBe(true);
    expect(dayGroup?.links.some((l) => l.href.endsWith("/day/badges"))).toBe(true);
    expect(dayGroup?.links.some((l) => l.href.endsWith("/day/entrance"))).toBe(true);

    const roleGroup = groups.find((g) => g.id === "event_roles:evt_1");
    expect(roleGroup?.links.some((l) => l.href.endsWith("/day"))).toBe(true);
    expect(roleGroup?.links.some((l) => l.href.includes("/registrations"))).toBe(
      true,
    );

    const attendeeGroup = groups.find((g) => g.id === "event_attendee:evt_1");
    expect(attendeeGroup?.links.some((l) => l.href === "/me/events/evt_1/directory")).toBe(
      true,
    );
  });
});
