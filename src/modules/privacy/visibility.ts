import type { Prisma } from "@prisma/client";

/** Fields attendees can share with peer attendees (§18). */
export const PROFILE_VISIBILITY_FIELDS = [
  "name",
  "jobTitle",
  "company",
  "country",
  "photo",
  "about",
  "interests",
  "lookingFor",
  "offering",
  "website",
  "linkedin",
  "industry",
  "email",
  "phone",
] as const;

export type ProfileVisibilityField = (typeof PROFILE_VISIBILITY_FIELDS)[number];

export type FieldVisibility = Record<ProfileVisibilityField, boolean>;

/** Fields that turn on when profileVisible is true (email/phone stay opt-in). */
export const PUBLIC_PROFILE_FIELDS = [
  "name",
  "jobTitle",
  "company",
  "country",
  "photo",
  "about",
  "interests",
  "lookingFor",
  "offering",
  "website",
  "linkedin",
  "industry",
] as const satisfies readonly ProfileVisibilityField[];

export type PrivacyViewer = "staff" | "peer" | "self";

export type PrivacySettingsLike = {
  profileVisible?: boolean | null;
  showEmail?: boolean | null;
  showPhone?: boolean | null;
  visibility?: unknown;
} | null;

export type AttendeeProfileLike = {
  about?: string | null;
  lookingFor?: string | null;
  offering?: string | null;
  interests?: unknown;
  industry?: string | null;
  website?: string | null;
  photoUrl?: string | null;
  linkedinUrl?: string | null;
} | null;

export type AttendeeForRedaction = {
  firstName: string;
  lastName: string;
  company: string | null;
  jobTitle: string | null;
  country: string | null;
  email: string;
  phone: string | null;
  profile?: AttendeeProfileLike;
};

export type RedactedAttendee = {
  firstName: string | null;
  lastName: string | null;
  company: string | null;
  jobTitle: string | null;
  country: string | null;
  email: string | null;
  phone: string | null;
  about: string | null;
  lookingFor: string | null;
  offering: string | null;
  interests: string[];
  industry: string | null;
  website: string | null;
  photoUrl: string | null;
  linkedinUrl: string | null;
};

const FIELD_LABELS: Record<ProfileVisibilityField, string> = {
  name: "Name",
  jobTitle: "Job title",
  company: "Company",
  country: "Country",
  photo: "Photo",
  about: "Bio",
  interests: "Interests",
  lookingFor: "What I'm looking for",
  offering: "What I offer",
  website: "Website",
  linkedin: "LinkedIn",
  industry: "Industry",
  email: "Email",
  phone: "Phone",
};

export function visibilityFieldLabel(field: ProfileVisibilityField): string {
  return FIELD_LABELS[field];
}

export function defaultFieldVisibility(options?: {
  profileVisible?: boolean;
  showEmail?: boolean;
  showPhone?: boolean;
}): FieldVisibility {
  const profileVisible = options?.profileVisible !== false;
  const visibility = {} as FieldVisibility;
  for (const field of PUBLIC_PROFILE_FIELDS) {
    visibility[field] = profileVisible;
  }
  visibility.email = options?.showEmail === true;
  visibility.phone = options?.showPhone === true;
  return visibility;
}

function asBoolean(value: unknown, fallback: boolean): boolean {
  if (typeof value === "boolean") return value;
  return fallback;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

/**
 * Resolve field flags from visibility JSON, falling back to legacy columns
 * when the JSON is missing or incomplete (pre-migration / questionnaire create).
 */
export function resolveFieldVisibility(
  privacy: PrivacySettingsLike,
): FieldVisibility {
  const profileVisible = privacy?.profileVisible !== false;
  const fallback = defaultFieldVisibility({
    profileVisible,
    showEmail: privacy?.showEmail === true,
    showPhone: privacy?.showPhone === true,
  });

  const raw = privacy?.visibility;
  if (raw == null || typeof raw !== "object" || Array.isArray(raw)) {
    return fallback;
  }

  const record = raw as Record<string, unknown>;
  const resolved = { ...fallback };
  for (const field of PROFILE_VISIBILITY_FIELDS) {
    if (field in record) {
      resolved[field] = asBoolean(record[field], fallback[field]);
    }
  }

  // Prefer explicit legacy columns when visibility JSON omitted email/phone keys
  // (older partial writes); otherwise trust JSON (kept in sync on save).
  if (!("email" in record) && privacy?.showEmail != null) {
    resolved.email = privacy.showEmail === true;
  }
  if (!("phone" in record) && privacy?.showPhone != null) {
    resolved.phone = privacy.showPhone === true;
  }

  return resolved;
}

export function fieldVisibilityToJson(
  visibility: FieldVisibility,
): Prisma.InputJsonValue {
  const out: Record<string, boolean> = {};
  for (const field of PROFILE_VISIBILITY_FIELDS) {
    out[field] = visibility[field] === true;
  }
  return out;
}

export function parseVisibilityFromFormData(
  formData: FormData,
  options?: { profileVisible?: boolean },
): FieldVisibility {
  const profileVisible = options?.profileVisible !== false;
  const visibility = defaultFieldVisibility({
    profileVisible,
    showEmail: false,
    showPhone: false,
  });

  for (const field of PROFILE_VISIBILITY_FIELDS) {
    // Checkbox absent → false (HTML forms omit unchecked boxes).
    visibility[field] = formData.get(`visibility.${field}`) != null;
  }

  return visibility;
}

export function isProfileListed(
  privacy: PrivacySettingsLike,
): boolean {
  return privacy == null || privacy.profileVisible !== false;
}

export function isFieldVisibleToPeer(
  privacy: PrivacySettingsLike,
  field: ProfileVisibilityField,
): boolean {
  if (!isProfileListed(privacy)) return false;
  return resolveFieldVisibility(privacy)[field] === true;
}

function fullRedaction(attendee: AttendeeForRedaction): RedactedAttendee {
  return {
    firstName: attendee.firstName,
    lastName: attendee.lastName,
    company: attendee.company,
    jobTitle: attendee.jobTitle,
    country: attendee.country,
    email: attendee.email,
    phone: attendee.phone,
    about: attendee.profile?.about ?? null,
    lookingFor: attendee.profile?.lookingFor ?? null,
    offering: attendee.profile?.offering ?? null,
    interests: asStringArray(attendee.profile?.interests),
    industry: attendee.profile?.industry ?? null,
    website: attendee.profile?.website ?? null,
    photoUrl: attendee.profile?.photoUrl ?? null,
    linkedinUrl: attendee.profile?.linkedinUrl ?? null,
  };
}

/**
 * Apply the §18 redaction matrix.
 * - staff / self: full fields (organisers retain registration access)
 * - peer: only fields opted in
 * - when `requireListed` is true (default), peers get null if the profile is not listed
 */
export function redactAttendeeForViewer(
  attendee: AttendeeForRedaction,
  privacy: PrivacySettingsLike,
  viewer: PrivacyViewer,
  options?: { requireListed?: boolean },
): RedactedAttendee | null {
  if (viewer === "staff" || viewer === "self") {
    return fullRedaction(attendee);
  }

  const requireListed = options?.requireListed !== false;
  if (requireListed && !isProfileListed(privacy)) {
    return null;
  }

  const flags = resolveFieldVisibility(privacy);
  const show = (field: ProfileVisibilityField) => flags[field] === true;

  return {
    firstName: show("name") ? attendee.firstName : null,
    lastName: show("name") ? attendee.lastName : null,
    company: show("company") ? attendee.company : null,
    jobTitle: show("jobTitle") ? attendee.jobTitle : null,
    country: show("country") ? attendee.country : null,
    email: show("email") ? attendee.email : null,
    phone: show("phone") ? attendee.phone : null,
    about: show("about") ? (attendee.profile?.about ?? null) : null,
    lookingFor: show("lookingFor")
      ? (attendee.profile?.lookingFor ?? null)
      : null,
    offering: show("offering") ? (attendee.profile?.offering ?? null) : null,
    interests: show("interests")
      ? asStringArray(attendee.profile?.interests)
      : [],
    industry: show("industry") ? (attendee.profile?.industry ?? null) : null,
    website: show("website") ? (attendee.profile?.website ?? null) : null,
    photoUrl: show("photo") ? (attendee.profile?.photoUrl ?? null) : null,
    linkedinUrl: show("linkedin")
      ? (attendee.profile?.linkedinUrl ?? null)
      : null,
  };
}

/** Peer-safe display label when name is hidden. */
export function peerDisplayName(redacted: RedactedAttendee): string {
  const name = [redacted.firstName, redacted.lastName].filter(Boolean).join(" ");
  if (name) return name;
  if (redacted.company) return redacted.company;
  return "Attendee";
}
