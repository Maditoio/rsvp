import type { Contact } from "@prisma/client";

/** Standard keys that map onto Attendee / AttendeeProfile columns. */
export const ATTENDEE_SCALAR_KEYS = [
  "firstName",
  "lastName",
  "email",
  "phone",
  "company",
  "jobTitle",
  "country",
] as const;

export const PROFILE_SCALAR_KEYS = [
  "about",
  "industry",
  "website",
  "linkedinUrl",
  "photoUrl",
] as const;

/** Important fields tracked for pre-fill change provenance (§15). */
export const PROVENANCE_FIELD_KEYS = [
  "firstName",
  "lastName",
  "email",
  "phone",
  "company",
  "jobTitle",
  "industry",
  "country",
  "website",
  "linkedinUrl",
] as const;

export type ProvenanceFieldKey = (typeof PROVENANCE_FIELD_KEYS)[number];

export type FieldChange = {
  field: ProvenanceFieldKey;
  old: string;
  new: string;
  source: "organiser" | "attendee";
};

export type RegistrationAnswerValue = string | string[];

export type RegistrationAnswers = Record<string, RegistrationAnswerValue>;

export function formatAnswerValue(value: unknown): string {
  if (value == null) return "";
  if (Array.isArray(value)) {
    return value
      .filter((item): item is string => typeof item === "string")
      .map((item) => item.trim())
      .filter(Boolean)
      .join("; ");
  }
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return "";
}

export function normalizeComparable(value: unknown): string {
  return formatAnswerValue(value).replace(/\s+/g, " ").trim();
}

function contactPrefill(
  contact: Pick<
    Contact,
    | "firstName"
    | "lastName"
    | "email"
    | "phone"
    | "company"
    | "jobTitle"
    | "country"
  >,
): RegistrationAnswers {
  return {
    firstName: contact.firstName ?? "",
    lastName: contact.lastName ?? "",
    email: contact.email ?? "",
    phone: contact.phone ?? "",
    company: contact.company ?? "",
    jobTitle: contact.jobTitle ?? "",
    country: contact.country ?? "",
  };
}

function asAnswers(data: unknown): RegistrationAnswers {
  if (!data || typeof data !== "object" || Array.isArray(data)) return {};
  const out: RegistrationAnswers = {};
  for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
    if (typeof value === "string") {
      out[key] = value;
    } else if (Array.isArray(value)) {
      out[key] = value.filter((item): item is string => typeof item === "string");
    }
  }
  return out;
}

/**
 * Merge organiser-known Contact data with a prior RegistrationResponse (if any).
 * Prior answers win over blank contact fields; non-blank contact fields stay
 * unless the prior response already has a value for that key.
 */
export function buildRegistrationPrefill(input: {
  contact: Pick<
    Contact,
    | "firstName"
    | "lastName"
    | "email"
    | "phone"
    | "company"
    | "jobTitle"
    | "country"
  >;
  priorResponseData?: unknown;
}): RegistrationAnswers {
  const fromContact = contactPrefill(input.contact);
  const fromPrior = asAnswers(input.priorResponseData);
  const merged: RegistrationAnswers = { ...fromContact };

  for (const [key, value] of Object.entries(fromPrior)) {
    const formatted = formatAnswerValue(value);
    if (!formatted) continue;
    merged[key] = value;
  }

  return merged;
}

/**
 * Diff submitted answers against the pre-fill baseline for important fields.
 * When the submitted value differs from pre-fill, the change is attributed to
 * the attendee. Unchanged organiser-supplied values are not listed as changes.
 */
export function diffImportantFieldChanges(
  prefill: RegistrationAnswers,
  submitted: RegistrationAnswers,
): FieldChange[] {
  const changes: FieldChange[] = [];

  for (const field of PROVENANCE_FIELD_KEYS) {
    const oldValue = normalizeComparable(prefill[field]);
    const newValue = normalizeComparable(submitted[field]);
    if (oldValue === newValue) continue;
    changes.push({
      field,
      old: oldValue,
      new: newValue,
      source: "attendee",
    });
  }

  return changes;
}

export type AttendeeHydrationFields = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  company: string | null;
  jobTitle: string | null;
  country: string | null;
};

export type ProfileHydrationFields = {
  about: string | null;
  industry: string | null;
  website: string | null;
  linkedinUrl: string | null;
  photoUrl: string | null;
};

export type HydrationFieldKey =
  | (typeof ATTENDEE_SCALAR_KEYS)[number]
  | (typeof PROFILE_SCALAR_KEYS)[number];

export type RegistrationHydrationResult = {
  attendee: AttendeeHydrationFields;
  profile: ProfileHydrationFields;
  /** Fields taken from registration answers (not kept from existing). */
  hydratedFields: HydrationFieldKey[];
};

function firstNonEmpty(...values: unknown[]): string {
  for (const value of values) {
    const formatted = formatAnswerValue(value);
    if (formatted) return formatted;
  }
  return "";
}

function isBlank(value: string | null | undefined): boolean {
  return !value || !value.trim();
}

/**
 * Map known RegistrationResponse.data keys onto Attendee / AttendeeProfile.
 * Empty answer values are ignored. Non-empty existing attendee/profile values
 * are preserved (fill-empty only).
 */
export function hydrateAttendeeFromRegistrationData(
  data: RegistrationAnswers,
  existing?: {
    attendee?: Partial<AttendeeHydrationFields> | null;
    profile?: Partial<ProfileHydrationFields> | null;
  },
): RegistrationHydrationResult {
  const hydratedFields: HydrationFieldKey[] = [];
  const existingAttendee = existing?.attendee ?? {};
  const existingProfile = existing?.profile ?? {};

  function pickString(
    field: HydrationFieldKey,
    candidate: string,
    current: string | null | undefined,
    transform: (value: string) => string = (value) => value,
  ): string {
    if (!isBlank(current)) return current!.trim();
    if (!candidate) return "";
    hydratedFields.push(field);
    return transform(candidate);
  }

  function pickNullable(
    field: HydrationFieldKey,
    candidate: string,
    current: string | null | undefined,
  ): string | null {
    if (!isBlank(current)) return current!.trim();
    if (!candidate) return null;
    hydratedFields.push(field);
    return candidate;
  }

  const attendee: AttendeeHydrationFields = {
    firstName: pickString(
      "firstName",
      firstNonEmpty(data.firstName),
      existingAttendee.firstName,
    ),
    lastName: pickString(
      "lastName",
      firstNonEmpty(data.lastName),
      existingAttendee.lastName,
    ),
    email: pickString(
      "email",
      firstNonEmpty(data.email),
      existingAttendee.email,
      (value) => value.toLowerCase(),
    ),
    phone: pickNullable(
      "phone",
      firstNonEmpty(data.phone, data.mobile, data.telephone),
      existingAttendee.phone,
    ),
    company: pickNullable(
      "company",
      firstNonEmpty(data.company, data.organisation, data.organization),
      existingAttendee.company,
    ),
    jobTitle: pickNullable(
      "jobTitle",
      firstNonEmpty(data.jobTitle, data.title, data.job_title),
      existingAttendee.jobTitle,
    ),
    country: pickNullable(
      "country",
      firstNonEmpty(data.country),
      existingAttendee.country,
    ),
  };

  const profile: ProfileHydrationFields = {
    about: pickNullable(
      "about",
      firstNonEmpty(data.about, data.bio),
      existingProfile.about,
    ),
    industry: pickNullable(
      "industry",
      firstNonEmpty(data.industry),
      existingProfile.industry,
    ),
    website: pickNullable(
      "website",
      firstNonEmpty(data.website, data.websiteUrl),
      existingProfile.website,
    ),
    linkedinUrl: pickNullable(
      "linkedinUrl",
      firstNonEmpty(data.linkedinUrl, data.linkedin, data.linkedInUrl),
      existingProfile.linkedinUrl,
    ),
    photoUrl: pickNullable(
      "photoUrl",
      firstNonEmpty(data.photoUrl, data.photo),
      existingProfile.photoUrl,
    ),
  };

  return { attendee, profile, hydratedFields };
}

export function answerRowsForDisplay(
  fields: Array<{ key: string; label: string }>,
  data: unknown,
): Array<{ key: string; label: string; value: string }> {
  const answers = asAnswers(data);
  return fields.map((field) => ({
    key: field.key,
    label: field.label,
    value: formatAnswerValue(answers[field.key]) || "—",
  }));
}
