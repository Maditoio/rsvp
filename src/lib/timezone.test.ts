import { describe, expect, it } from "vitest";
import {
  parseDatetimeLocalValue,
  toDatetimeLocalValue,
  utcFromZonedDateTime,
} from "./timezone";

describe("datetime-local timezone helpers", () => {
  it("round-trips wall-clock times in a fixed-offset timezone", () => {
    const timeZone = "Africa/Johannesburg";
    const utc = utcFromZonedDateTime(2026, 9, 1, 9, 0, timeZone);
    const local = toDatetimeLocalValue(utc, timeZone);

    expect(local).toBe("2026-09-01T09:00");
    expect(parseDatetimeLocalValue(local, timeZone)?.toISOString()).toBe(
      utc.toISOString(),
    );
  });

  it("formats using the event timezone instead of the runtime timezone", () => {
    const utc = new Date("2026-09-01T07:00:00.000Z");
    expect(toDatetimeLocalValue(utc, "Africa/Johannesburg")).toBe(
      "2026-09-01T09:00",
    );
    expect(toDatetimeLocalValue(utc, "America/New_York")).toBe(
      "2026-09-01T03:00",
    );
  });
});
