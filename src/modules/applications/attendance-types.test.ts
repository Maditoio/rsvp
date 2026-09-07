import { describe, expect, it } from "vitest";
import {
  isPublicAttendanceSlug,
  publicAttendanceLabel,
  PUBLIC_ATTENDANCE_TYPES,
} from "./attendance-types";

describe("public attendance types", () => {
  it("exposes the supported public attendance types", () => {
    expect(PUBLIC_ATTENDANCE_TYPES.map((t) => t.slug)).toEqual([
      "delegate",
      "business-professional",
      "government",
      "media",
      "academic-student",
      "general-attendee",
    ]);
  });

  it("validates attendance slugs", () => {
    expect(isPublicAttendanceSlug("media")).toBe(true);
    expect(isPublicAttendanceSlug("sponsor")).toBe(false);
    expect(publicAttendanceLabel("academic-student")).toBe("Academic / Student");
    expect(publicAttendanceLabel("vip")).toBeNull();
  });
});
