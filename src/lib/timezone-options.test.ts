import { describe, expect, it } from "vitest";
import {
  formatTimezoneLabel,
  groupTimezoneOptions,
  isValidIanaTimezone,
} from "./timezone-options";

describe("timezone options", () => {
  it("validates IANA timezone identifiers", () => {
    expect(isValidIanaTimezone("Africa/Johannesburg")).toBe(true);
    expect(isValidIanaTimezone("Not/AZone")).toBe(false);
  });

  it("groups timezone options by region", () => {
    const groups = groupTimezoneOptions(["UTC", "Africa/Johannesburg", "Europe/London"]);
    expect(groups.map((group) => group.region)).toEqual(["Africa", "Europe", "Other"]);
  });

  it("formats timezone labels with offsets", () => {
    const label = formatTimezoneLabel("UTC");
    expect(label).toContain("UTC");
  });
});
