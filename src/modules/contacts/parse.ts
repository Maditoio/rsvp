import { z } from "zod";

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
