import { describe, expect, it } from "vitest";
import {
  GEOGRAPHY_OPTIONS,
  INDUSTRY_OPTIONS,
  LOOKING_FOR_OPTIONS,
  MEETING_PREFERENCE_OPTIONS,
  OFFERING_OPTIONS,
  emptyQuestionnaire,
  isQuestionnaireComplete,
  parseQuestionnaire,
  toAttendeeProfileSummary,
  toggleSelection,
} from "./questionnaire";

describe("matchmaking questionnaire", () => {
  it("includes the product spec §20 option lists", () => {
    expect([...LOOKING_FOR_OPTIONS]).toEqual([
      "Investors",
      "Customers",
      "Suppliers",
      "Technology",
      "Distribution partners",
      "Government relationships",
      "Joint ventures",
      "Acquisitions",
      "Financing",
      "Strategic partnerships",
    ]);
    expect([...OFFERING_OPTIONS]).toContain("Investment opportunities");
    expect([...INDUSTRY_OPTIONS]).toEqual([
      "Mining",
      "Energy",
      "Telecommunications",
      "Finance",
      "Government",
      "Infrastructure",
      "Technology",
    ]);
    expect([...GEOGRAPHY_OPTIONS]).toEqual(
      expect.arrayContaining([
        "South Africa",
        "DRC",
        "Zambia",
        "Kenya",
        "Nigeria",
        "Ghana",
        "Europe",
        "Middle East",
        "Asia",
      ]),
    );
    expect([...MEETING_PREFERENCE_OPTIONS]).toEqual([
      "Investors",
      "Suppliers",
      "Customers",
      "Partners",
      "Government",
      "Media",
    ]);
  });

  it("drops unknown values and reads completedAt", () => {
    const parsed = parseQuestionnaire({
      lookingFor: ["Investors", "Unknown", "Investors"],
      offering: ["Capital"],
      industries: ["Mining", 12],
      geographies: ["South Africa"],
      meetingPreferences: ["Media"],
      completedAt: "2026-08-18T12:00:00.000Z",
    });
    expect(parsed.lookingFor).toEqual(["Investors"]);
    expect(parsed.offering).toEqual(["Capital"]);
    expect(parsed.industries).toEqual(["Mining"]);
    expect(isQuestionnaireComplete(parsed)).toBe(true);
  });

  it("treats missing JSON as an empty incomplete questionnaire", () => {
    expect(parseQuestionnaire(null)).toEqual(emptyQuestionnaire());
    expect(isQuestionnaireComplete(null)).toBe(false);
  });

  it("syncs a readable profile summary for the Phase 2 directory", () => {
    const summary = toAttendeeProfileSummary({
      lookingFor: ["Investors", "Customers"],
      offering: ["Capital"],
      industries: ["Mining", "Energy"],
      geographies: ["South Africa"],
      meetingPreferences: ["Investors"],
      completedAt: "2026-08-18T12:00:00.000Z",
    });
    expect(summary.lookingFor).toBe("Investors, Customers");
    expect(summary.offering).toBe("Capital");
    expect(summary.interests).toEqual(["Mining", "Energy", "Investors", "Customers", "Capital"]);
  });

  it("toggles multi-select values", () => {
    expect(toggleSelection(["Mining"], "Energy")).toEqual(["Mining", "Energy"]);
    expect(toggleSelection(["Mining", "Energy"], "Mining")).toEqual(["Energy"]);
  });
});
