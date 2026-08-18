import { z } from "zod";
import { isCountryName } from "@/lib/countries";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type ImportRow = {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  company?: string;
  jobTitle?: string;
  country?: string;
  category?: string;
  vip?: boolean;
  speaker?: boolean;
  sponsor?: boolean;
  notes?: string;
  line: number;
};

export type ImportIssue = {
  line: number;
  email?: string;
  reason: "invalid_email" | "missing_name" | "missing_email" | "duplicate_in_file";
};

export type ImportPreview = {
  valid: ImportRow[];
  issues: ImportIssue[];
};

function cell(row: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const match = Object.keys(row).find(
      (k) => k.trim().toLowerCase() === key.toLowerCase(),
    );
    if (match && row[match] != null && String(row[match]).trim()) {
      return String(row[match]).trim();
    }
  }
  return "";
}

function truthy(value: string) {
  return ["1", "true", "yes", "y", "vip"].includes(value.toLowerCase());
}

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function previewImport(
  rows: Record<string, unknown>[],
): ImportPreview {
  const valid: ImportRow[] = [];
  const issues: ImportIssue[] = [];
  const seen = new Set<string>();

  rows.forEach((row, index) => {
    const line = index + 2;
    const firstName = cell(row, ["first name", "firstname", "first_name"]);
    const lastName = cell(row, ["last name", "lastname", "last_name"]);
    const email = normalizeEmail(cell(row, ["email", "e-mail"]));

    if (!email) {
      issues.push({ line, reason: "missing_email" });
      return;
    }
    if (!EMAIL_RE.test(email)) {
      issues.push({ line, email, reason: "invalid_email" });
      return;
    }
    if (!firstName || !lastName) {
      issues.push({ line, email, reason: "missing_name" });
      return;
    }
    if (seen.has(email)) {
      issues.push({ line, email, reason: "duplicate_in_file" });
      return;
    }
    seen.add(email);

    valid.push({
      firstName,
      lastName,
      email,
      phone: cell(row, ["phone", "mobile"]),
      company: cell(row, ["company", "organisation", "organization"]),
      jobTitle: cell(row, ["job title", "jobtitle", "title"]),
      country: cell(row, ["country"]),
      category: cell(row, ["category"]),
      vip: truthy(cell(row, ["vip"])),
      speaker: truthy(cell(row, ["speaker"])),
      sponsor: truthy(cell(row, ["sponsor"])),
      notes: cell(row, ["notes"]),
      line,
    });
  });

  return { valid, issues };
}

export const confirmSchema = z.object({
  eventId: z.string(),
});

const optionalText = (max: number, message: string) =>
  z
    .string()
    .trim()
    .max(max, message)
    .optional()
    .or(z.literal(""));

const PHONE_RE = /^[+0-9()\s.-]{7,40}$/;

export const contactCreateSchema = z.object({
  firstName: z
    .string()
    .trim()
    .min(1, "First name is required")
    .max(80, "First name must be 80 characters or fewer"),
  lastName: z
    .string()
    .trim()
    .min(1, "Last name is required")
    .max(80, "Last name must be 80 characters or fewer"),
  email: z
    .string()
    .trim()
    .min(1, "Email is required")
    .email("Enter a valid email address")
    .transform((value) => normalizeEmail(value)),
  phone: z
    .string()
    .trim()
    .max(40, "Phone must be 40 characters or fewer")
    .refine((value) => value === "" || PHONE_RE.test(value), {
      message: "Enter a valid phone number",
    })
    .optional()
    .or(z.literal("")),
  company: optionalText(160, "Company must be 160 characters or fewer"),
  jobTitle: optionalText(160, "Job title must be 160 characters or fewer"),
  country: z
    .string()
    .trim()
    .refine((value) => value === "" || isCountryName(value), {
      message: "Select a country from the list",
    }),
});

export type ContactCreateInput = z.infer<typeof contactCreateSchema>;

export function contactCreateFromFormData(formData: FormData) {
  return {
    firstName: String(formData.get("firstName") ?? ""),
    lastName: String(formData.get("lastName") ?? ""),
    email: String(formData.get("email") ?? ""),
    phone: String(formData.get("phone") ?? ""),
    company: String(formData.get("company") ?? ""),
    jobTitle: String(formData.get("jobTitle") ?? ""),
    country: String(formData.get("country") ?? ""),
  };
}

export function contactCreateFieldErrors(
  error: z.ZodError,
): Partial<Record<keyof ContactCreateInput, string>> {
  const fields: Partial<Record<keyof ContactCreateInput, string>> = {};
  for (const issue of error.issues) {
    const key = issue.path[0];
    if (typeof key === "string" && !(key in fields)) {
      fields[key as keyof ContactCreateInput] = issue.message;
    }
  }
  return fields;
}
