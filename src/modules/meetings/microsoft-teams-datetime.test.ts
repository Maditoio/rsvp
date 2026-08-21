import { describe, expect, it } from "vitest";
import { toGraphOnlineMeetingDateTime } from "./microsoft-teams";

describe("toGraphOnlineMeetingDateTime", () => {
  it("emits DateTimeOffset with fractional seconds and explicit UTC offset", () => {
    const value = toGraphOnlineMeetingDateTime(
      new Date("2026-09-15T12:00:00.000Z"),
    );
    expect(value).toBe("2026-09-15T12:00:00.0000000+00:00");
  });

  it("does not emit the bare ...00Z form previously sent to Graph", () => {
    const value = toGraphOnlineMeetingDateTime(
      new Date("2026-09-15T14:30:34.244Z"),
    );
    expect(value).not.toMatch(/Z$/);
    expect(value).toBe("2026-09-15T14:30:34.2440000+00:00");
  });
});
