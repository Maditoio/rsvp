import { describe, expect, it } from "vitest";
import { eventNav, parseOrganiserEventId } from "./nav";

describe("eventNav", () => {
  it("lists each destination once, including a single Settings item", () => {
    const items = eventNav("acme", "evt_1");
    const labels = items.map((item) => item.label);
    expect(labels).toEqual([...new Set(labels)]);
    expect(labels.filter((label) => label === "Settings")).toHaveLength(1);
    expect(labels).not.toContain("Matchmaking");
    expect(new Set(items.map((item) => item.href)).size).toBe(items.length);
  });

  it("parses the current event id and ignores the new-event route", () => {
    expect(
      parseOrganiserEventId("/app/acme/events/evt_1/settings", "acme"),
    ).toBe("evt_1");
    expect(parseOrganiserEventId("/app/acme/events/new", "acme")).toBeNull();
    expect(parseOrganiserEventId("/app/acme/events", "acme")).toBeNull();
  });
});
