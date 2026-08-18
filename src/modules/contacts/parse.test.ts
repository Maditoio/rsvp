import { describe, expect, it } from "vitest";
import { contactCreateSchema, previewImport } from "./parse";

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

describe("contactCreateSchema", () => {
  it("requires a name and a valid email, and normalises the address", () => {
    const result = contactCreateSchema.safeParse({
      firstName: " Ada ",
      lastName: "Lovelace",
      email: "ADA@Example.COM",
      phone: "",
      company: "Analytical Engines",
      jobTitle: "",
      country: "United Kingdom",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toMatchObject({
        firstName: "Ada",
        lastName: "Lovelace",
        email: "ada@example.com",
        company: "Analytical Engines",
        country: "United Kingdom",
      });
    }
  });

  it("rejects a missing name, invalid email, phone, or unknown country", () => {
    const missingName = contactCreateSchema.safeParse({
      firstName: " ",
      lastName: "Lovelace",
      email: "ada@example.com",
      country: "",
    });
    expect(missingName.success).toBe(false);

    const invalidEmail = contactCreateSchema.safeParse({
      firstName: "Ada",
      lastName: "Lovelace",
      email: "not-an-email",
      country: "",
    });
    expect(invalidEmail.success).toBe(false);

    const invalidPhone = contactCreateSchema.safeParse({
      firstName: "Ada",
      lastName: "Lovelace",
      email: "ada@example.com",
      phone: "abc",
      country: "",
    });
    expect(invalidPhone.success).toBe(false);

    const unknownCountry = contactCreateSchema.safeParse({
      firstName: "Ada",
      lastName: "Lovelace",
      email: "ada@example.com",
      country: "Narnia",
    });
    expect(unknownCountry.success).toBe(false);
  });
});
