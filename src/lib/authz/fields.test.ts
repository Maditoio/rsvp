import { describe, expect, it } from "vitest";
import { maskAttendeeForCheckIn } from "./fields";

describe("check-in field mask", () => {
  it("returns only name, company, category, and check-in status — never email or phone", () => {
    const view = maskAttendeeForCheckIn({
      id: "att_1",
      firstName: "Ada",
      lastName: "Lovelace",
      company: "Analytical Engines",
      category: { name: "Speaker" },
      checkIns: [{ checkedInAt: new Date("2026-08-17T10:00:00Z") }],
    });

    expect(view).toEqual({
      attendeeId: "att_1",
      name: "Ada Lovelace",
      company: "Analytical Engines",
      category: "Speaker",
      alreadyCheckedIn: true,
      checkedInAt: new Date("2026-08-17T10:00:00Z"),
    });
    expect(view).not.toHaveProperty("email");
    expect(view).not.toHaveProperty("phone");
    expect(JSON.stringify(view)).not.toMatch(/@/);
    expect(Object.keys(view).sort()).toEqual([
      "alreadyCheckedIn",
      "attendeeId",
      "category",
      "checkedInAt",
      "company",
      "name",
    ]);
  });
});
