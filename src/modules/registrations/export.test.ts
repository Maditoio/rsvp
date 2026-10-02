import { describe, expect, it } from "vitest";
import {
  csvCell,
  registrationExportHeaders,
  registrationExportRow,
} from "./export";

describe("registration export", () => {
  const fields = [
    { key: "firstName", label: "First name" },
    { key: "company", label: "Company" },
    { key: "custom-q", label: "Favourite session" },
  ];

  it("builds headers from field labels plus status columns", () => {
    expect(registrationExportHeaders(fields)).toEqual([
      "status",
      "submittedAt",
      "invitationStatus",
      "First name",
      "Company",
      "Favourite session",
    ]);
  });

  it("maps response data onto dynamic columns", () => {
    expect(
      registrationExportRow(fields, {
        status: "COMPLETED",
        submittedAt: "2026-10-02T08:00:00.000Z",
        invitationStatus: "ACCEPTED",
        data: {
          firstName: "John",
          company: "ABC, Mining",
          "custom-q": ["A", "B"],
        },
      }),
    ).toEqual([
      "COMPLETED",
      "2026-10-02T08:00:00.000Z",
      "ACCEPTED",
      "John",
      "ABC, Mining",
      "A; B",
    ]);
  });

  it("escapes CSV cells with commas and quotes", () => {
    expect(csvCell('ABC, "Mining"')).toBe('"ABC, ""Mining"""');
  });
});
