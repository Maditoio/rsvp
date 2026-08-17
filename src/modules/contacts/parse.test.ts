import { describe, expect, it } from "vitest";
import { previewImport } from "./parse";

describe("contact import preview", () => {
  it("reports invalid email, missing name, and in-file duplicates instead of dropping them silently", () => {
    const preview = previewImport([
      {
        "First Name": "Ada",
        "Last Name": "Lovelace",
        Email: "ada@example.com",
      },
      {
        "First Name": "Bad",
        "Last Name": "Address",
        Email: "not-an-email",
      },
      {
        "First Name": "",
        "Last Name": "Nameless",
        Email: "noname@example.com",
      },
      {
        "First Name": "Ada",
        "Last Name": "Again",
        Email: "ADA@example.com",
      },
      {
        Email: "missing-name@example.com",
        "Last Name": "Only",
      },
    ]);

    expect(preview.valid).toEqual([
      expect.objectContaining({
        firstName: "Ada",
        lastName: "Lovelace",
        email: "ada@example.com",
        line: 2,
      }),
    ]);

    expect(preview.issues).toEqual([
      { line: 3, email: "not-an-email", reason: "invalid_email" },
      { line: 4, email: "noname@example.com", reason: "missing_name" },
      { line: 5, email: "ada@example.com", reason: "duplicate_in_file" },
      { line: 6, email: "missing-name@example.com", reason: "missing_name" },
    ]);

    const accounted = preview.valid.length + preview.issues.length;
    expect(accounted).toBe(5);
  });
});
