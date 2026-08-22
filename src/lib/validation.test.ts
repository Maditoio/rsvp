import { describe, expect, it } from "vitest";
import {
  emailFieldSchema,
  isValidEmail,
  optionalUrlSchema,
  parseDateRange,
  parseOptionalDateRange,
} from "@/lib/validation";

describe("validation", () => {
  it("accepts valid emails", () => {
    expect(isValidEmail("person@example.com")).toBe(true);
    expect(emailFieldSchema.parse(" Person@Example.COM ")).toBe("person@example.com");
  });

  it("rejects invalid emails", () => {
    expect(isValidEmail("not-an-email")).toBe(false);
    expect(() => emailFieldSchema.parse("bad@")).toThrow();
  });

  it("validates optional urls", () => {
    expect(optionalUrlSchema.parse("")).toBe("");
    expect(optionalUrlSchema.parse("https://example.com")).toBe("https://example.com");
    expect(() => optionalUrlSchema.parse("example.com")).toThrow();
  });

  it("validates date ranges", () => {
    expect(
      parseDateRange("2026-08-22T10:00", "2026-08-22T11:00").ok,
    ).toBe(true);
    expect(
      parseDateRange("2026-08-22T11:00", "2026-08-22T10:00").ok,
    ).toBe(false);
    expect(parseOptionalDateRange("", "").ok).toBe(true);
    expect(parseOptionalDateRange("2026-08-22T10:00", "").ok).toBe(false);
  });
});
