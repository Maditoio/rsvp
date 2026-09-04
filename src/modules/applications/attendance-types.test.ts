import { describe, expect, it } from "vitest";
import {
  isPublicAttendanceSlug,
  publicAttendanceLabel,
  PUBLIC_ATTENDANCE_TYPES,
} from "./attendance-types";

describe("public attendance types", () => {
  it("exposes only media, delegate, exhibitor, and other", () => {
    expect(PUBLIC_ATTENDANCE_TYPES.map((t) => t.slug)).toEqual([
      "delegate",
      "media",
      "exhibitor",
      "other",
    ]);
  });

  it("validates attendance slugs", () => {
    expect(isPublicAttendanceSlug("media")).toBe(true);
    expect(isPublicAttendanceSlug("sponsor")).toBe(false);
    expect(publicAttendanceLabel("exhibitor")).toBe("Exhibitor");
    expect(publicAttendanceLabel("vip")).toBeNull();
  });
});
