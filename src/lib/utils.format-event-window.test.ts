import { describe, expect, it } from "vitest";
import { formatEventWindow } from "@/lib/utils";

describe("formatEventWindow", () => {
  it("returns Dates TBC when start is missing", () => {
    expect(formatEventWindow(null, null, "UTC")).toBe("Dates TBC");
  });

  it("includes time for a single start", () => {
    const start = new Date("2026-10-05T08:00:00.000Z");
    expect(formatEventWindow(start, null, "UTC")).toMatch(
      /5 Oct 2026, 08:00/,
    );
  });

  it("shows start and end times on the same day", () => {
    const start = new Date("2026-10-05T07:00:00.000Z");
    const end = new Date("2026-10-05T15:00:00.000Z");
    const label = formatEventWindow(start, end, "UTC");
    expect(label).toMatch(/5 Oct 2026, 07:00/);
    expect(label).toMatch(/15:00/);
    expect(label).not.toMatch(/5 Oct 2026, 07:00 – 5 Oct 2026/);
  });

  it("shows both dates when the window spans days", () => {
    const start = new Date("2026-10-05T08:00:00.000Z");
    const end = new Date("2026-10-07T16:00:00.000Z");
    const label = formatEventWindow(start, end, "UTC");
    expect(label).toMatch(/5 Oct 2026, 08:00/);
    expect(label).toMatch(/7 Oct 2026, 16:00/);
  });
});
