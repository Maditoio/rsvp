import { z } from "zod";
import { isCountryName } from "@/lib/countries";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const IMPORT_FIELD_KEYS = [
  "firstName",
  "lastName",
  "email",
  "phone",
  "company",
  "jobTitle",
  "country",
  "category",
  "vip",
  "speaker",
  "sponsor",
  "notes",
  "ignore",
] as const;

export type ImportFieldKey = (typeof IMPORT_FIELD_KEYS)[number];

export type ImportFieldDef = {
  key: Exclude<ImportFieldKey, "ignore">;
  label: string;
  requirement: "required" | "required_if_no_email" | "required_if_no_name" | "optional";
};

export const IMPORT_FIELDS: ImportFieldDef[] = [
  { key: "firstName", label: "First Name", requirement: "required_if_no_email" },
  { key: "lastName", label: "Last Name", requirement: "required_if_no_email" },
  { key: "email", label: "Email", requirement: "required_if_no_name" },
  { key: "phone", label: "Phone", requirement: "optional" },
  { key: "company", label: "Company", requirement: "optional" },
  { key: "jobTitle", label: "Job Title", requirement: "optional" },
  { key: "country", label: "Country", requirement: "optional" },
  { key: "category", label: "Category", requirement: "optional" },
  { key: "vip", label: "VIP", requirement: "optional" },
  { key: "speaker", label: "Speaker", requirement: "optional" },
  { key: "sponsor", label: "Sponsor", requirement: "optional" },
  { key: "notes", label: "Notes", requirement: "optional" },
];

/** Header aliases used when auto-guessing a column map. */
const FIELD_ALIASES: Record<Exclude<ImportFieldKey, "ignore">, string[]> = {
  firstName: ["first name", "firstname", "first_name", "given name"],
  lastName: ["last name", "lastname", "last_name", "surname", "family name"],
  email: ["email", "e-mail", "email address", "emailaddress"],
  phone: ["phone", "mobile", "telephone", "phone number"],
  company: ["company", "organisation", "organization", "org"],
  jobTitle: ["job title", "jobtitle", "title", "position", "role"],
  country: ["country"],
  category: ["category", "invitation category"],
  vip: ["vip"],
  speaker: ["speaker"],
  sponsor: ["sponsor"],
  notes: ["notes", "note", "comments"],
};

export type ColumnMap = Record<string, ImportFieldKey>;

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

function normalizeHeader(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export function guessColumnMap(headers: string[]): ColumnMap {
  const map: ColumnMap = {};
  const used = new Set<Exclude<ImportFieldKey, "ignore">>();

  for (const header of headers) {
    const normalized = normalizeHeader(header);
    let matched: Exclude<ImportFieldKey, "ignore"> | "ignore" = "ignore";
    for (const [field, aliases] of Object.entries(FIELD_ALIASES) as [
      Exclude<ImportFieldKey, "ignore">,
      string[],
    ][]) {
      if (used.has(field)) continue;
      if (aliases.some((alias) => alias === normalized)) {
        matched = field;
        used.add(field);
        break;
      }
    }
    map[header] = matched;
  }
  return map;
}

function cellFromMapped(
  row: Record<string, unknown>,
  map: ColumnMap,
  field: Exclude<ImportFieldKey, "ignore">,
) {
  for (const [header, mapped] of Object.entries(map)) {
    if (mapped !== field) continue;
    const value = row[header];
    if (value != null && String(value).trim()) return String(value).trim();
  }
  return "";
}

function truthy(value: string) {
  return ["1", "true", "yes", "y", "vip"].includes(value.toLowerCase());
}

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function validateColumnMap(map: ColumnMap): string | null {
  const values = Object.values(map);
  const hasEmail = values.includes("email");
  const hasFirst = values.includes("firstName");
  const hasLast = values.includes("lastName");
  if (!hasEmail && !(hasFirst && hasLast)) {
    return "Map either Email, or both First Name and Last Name.";
  }
  if (!hasEmail) {
    return "Email is required for invitees. Map an Email column.";
  }
  if (!hasFirst || !hasLast) {
    return "Map both First Name and Last Name.";
  }
  const assigned = values.filter((v) => v !== "ignore");
  const unique = new Set(assigned);
  if (unique.size !== assigned.length) {
    return "Each field can only be mapped once.";
  }
  return null;
}

export function previewImport(
  rows: Record<string, unknown>[],
  columnMap?: ColumnMap,
): ImportPreview {
  const valid: ImportRow[] = [];
  const issues: ImportIssue[] = [];
  const seen = new Set<string>();
  const headers = rows.length > 0 ? Object.keys(rows[0]!) : [];
  const map = columnMap ?? guessColumnMap(headers);

  rows.forEach((row, index) => {
    const line = index + 2;
    const firstName = cellFromMapped(row, map, "firstName");
    const lastName = cellFromMapped(row, map, "lastName");
    const email = normalizeEmail(cellFromMapped(row, map, "email"));

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
      phone: cellFromMapped(row, map, "phone") || undefined,
      company: cellFromMapped(row, map, "company") || undefined,
      jobTitle: cellFromMapped(row, map, "jobTitle") || undefined,
      country: cellFromMapped(row, map, "country") || undefined,
      category: cellFromMapped(row, map, "category") || undefined,
      vip: truthy(cellFromMapped(row, map, "vip")),
      speaker: truthy(cellFromMapped(row, map, "speaker")),
      sponsor: truthy(cellFromMapped(row, map, "sponsor")),
      notes: cellFromMapped(row, map, "notes") || undefined,
      line,
    });
  });

  return { valid, issues };
}

export const TEMPLATE_HEADERS = IMPORT_FIELDS.map((f) => f.label);

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
