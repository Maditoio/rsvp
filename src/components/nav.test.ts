import { describe, expect, it } from "vitest";
import {
  eventNav,
  eventNavGroups,
  eventSettingsItem,
  isNavActive,
  parseOrganiserEventId,
} from "./nav";

describe("eventNav", () => {
  it("flat list includes each destination once with a single Event settings item", () => {
    const items = eventNav("acme", "evt_1");
    const labels = items.map((item) => item.label);
    expect(labels).toEqual([...new Set(labels)]);
    expect(labels.filter((l) => l === "Event settings")).toHaveLength(1);
    expect(labels).not.toContain("Dashboard");
    expect(labels).toContain("Overview");
    expect(labels).toContain("Staff");
    expect(new Set(items.map((item) => item.href)).size).toBe(items.length);
  });
});

describe("eventNavGroups", () => {
  it("returns four groups in the correct order", () => {
    const groups = eventNavGroups("acme", "evt_1");
    expect(groups.map((g) => g.label)).toEqual([
      "Setup",
      "Guests",
      "Event day",
      "Communications & data",
    ]);
  });

  it("does not include Settings in the grouped items", () => {
    const groups = eventNavGroups("acme", "evt_1");
    const allLabels = groups.flatMap((g) => g.items.map((i) => i.label));
    expect(allLabels).not.toContain("Event settings");
    expect(allLabels).not.toContain("Settings");
  });
});

describe("eventSettingsItem", () => {
  it("returns an Event settings item with the correct href", () => {
    const item = eventSettingsItem("acme", "evt_1");
    expect(item.label).toBe("Event settings");
    expect(item.href).toBe("/app/acme/events/evt_1/settings");
  });
});

describe("isNavActive", () => {
  const eventsHref = "/app/acme/events";

  it("keeps Events active on the list and new-event routes", () => {
    expect(isNavActive("/app/acme/events", eventsHref)).toBe(true);
    expect(isNavActive("/app/acme/events/new", eventsHref)).toBe(true);
  });

  it("does not keep Events active inside a specific event workspace", () => {
    expect(isNavActive("/app/acme/events/evt_1", eventsHref)).toBe(false);
    expect(isNavActive("/app/acme/events/evt_1/settings", eventsHref)).toBe(
      false,
    );
  });
});

describe("parseOrganiserEventId", () => {
  it("parses the current event id and ignores the new-event route", () => {
    expect(
      parseOrganiserEventId("/app/acme/events/evt_1/settings", "acme"),
    ).toBe("evt_1");
    expect(parseOrganiserEventId("/app/acme/events/new", "acme")).toBeNull();
    expect(parseOrganiserEventId("/app/acme/events", "acme")).toBeNull();
  });
});
