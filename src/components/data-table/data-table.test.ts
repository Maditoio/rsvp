import { describe, expect, it } from "vitest";
import {
  eventRoleTier,
  orgRoleTier,
} from "@/components/ui/role-tag";
import { visiblePageNumbers } from "@/components/data-table/use-table-query";

describe("role tiers", () => {
  it("maps org and event roles to the three solid tiers", () => {
    expect(orgRoleTier("OWNER")).toBe(1);
    expect(orgRoleTier("ADMIN")).toBe(2);
    expect(eventRoleTier("EVENT_ADMINISTRATOR")).toBe(1);
    expect(eventRoleTier("REGISTRATION_MANAGER")).toBe(2);
    expect(eventRoleTier("CHECKIN_STAFF")).toBe(3);
  });
});

describe("visiblePageNumbers", () => {
  it("lists all pages when count is small", () => {
    expect(visiblePageNumbers(1, 5)).toEqual([1, 2, 3, 4, 5]);
  });

  it("collapses with ellipsis when many pages", () => {
    expect(visiblePageNumbers(5, 22)).toContain("ellipsis");
    expect(visiblePageNumbers(5, 22)).toContain(1);
    expect(visiblePageNumbers(5, 22)).toContain(22);
    expect(visiblePageNumbers(5, 22)).toContain(5);
  });
});
