import { z } from "zod";

export const SPEAKER_BIO_MAX = 4000;

export type EventSpeakerRecord = {
  id: string;
  firstName: string;
  lastName: string;
  jobTitle: string | null;
  organization: string | null;
  country: string | null;
  bio: string | null;
  photoUrl: string | null;
  linkedInUrl: string | null;
  websiteUrl: string | null;
  featured: boolean;
  hidden: boolean;
  sortOrder: number;
};

export function speakerDisplayName(
  speaker: Pick<EventSpeakerRecord, "firstName" | "lastName">,
): string {
  const name = [speaker.firstName, speaker.lastName].filter(Boolean).join(" ").trim();
  return name || "Speaker";
}

export function speakerSubtitle(speaker: EventSpeakerRecord): string | null {
  const line = [speaker.jobTitle, speaker.organization].filter(Boolean).join(" · ");
  return line || null;
}

const optionalUrl = z
  .string()
  .trim()
  .max(2000)
  .optional()
  .or(z.literal(""))
  .transform((v) => {
    if (!v) return null;
    try {
      return new URL(v).toString();
    } catch {
      return null;
    }
  });

export const createSpeakerSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required").max(60),
  lastName: z.string().trim().max(60).optional().or(z.literal("")),
  jobTitle: z.string().trim().max(160).optional().or(z.literal("")),
  organization: z.string().trim().max(160).optional().or(z.literal("")),
  country: z.string().trim().max(80).optional().or(z.literal("")),
  bio: z.string().trim().max(SPEAKER_BIO_MAX).optional().or(z.literal("")),
  linkedInUrl: optionalUrl,
  websiteUrl: optionalUrl,
  featured: z
    .union([z.literal("on"), z.literal("true"), z.literal("false"), z.boolean()])
    .optional()
    .transform((v) => v === "on" || v === true || v === "true"),
  hidden: z
    .union([z.literal("on"), z.literal("true"), z.literal("false"), z.boolean()])
    .optional()
    .transform((v) => v === "on" || v === true || v === "true"),
});

export const updateSpeakerSchema = createSpeakerSchema.extend({
  id: z.string().min(1),
});

/** Map legacy website-config speaker items into create payloads. */
export function legacyWebsiteSpeakerToRecord(
  raw: Record<string, unknown>,
  index: number,
): Omit<EventSpeakerRecord, "sortOrder"> & { sortOrder: number } {
  let firstName = typeof raw.firstName === "string" ? raw.firstName.trim() : "";
  let lastName = typeof raw.lastName === "string" ? raw.lastName.trim() : "";

  if (!firstName && !lastName && typeof raw.name === "string") {
    const parts = raw.name.trim().split(/\s+/);
    firstName = parts[0] ?? "Speaker";
    lastName = parts.slice(1).join(" ");
  }
  if (!firstName) firstName = "Speaker";

  const bioRaw = typeof raw.bio === "string" ? raw.bio.trim() : "";
  const bio =
    bioRaw.length > SPEAKER_BIO_MAX ? bioRaw.slice(0, SPEAKER_BIO_MAX) : bioRaw || null;

  const linkedIn =
    typeof raw.linkedInUrl === "string"
      ? raw.linkedInUrl
      : typeof raw.linkedIn === "string"
        ? raw.linkedIn
        : null;
  const website =
    typeof raw.websiteUrl === "string"
      ? raw.websiteUrl
      : typeof raw.website === "string"
        ? raw.website
        : null;

  return {
    id: String(raw.id ?? `spk_${index}`),
    firstName: firstName.slice(0, 60),
    lastName: lastName.slice(0, 60),
    jobTitle:
      typeof raw.jobTitle === "string"
        ? raw.jobTitle.trim().slice(0, 160) || null
        : typeof raw.title === "string"
          ? raw.title.trim().slice(0, 160) || null
          : null,
    organization:
      typeof raw.organization === "string"
        ? raw.organization.trim().slice(0, 160) || null
        : typeof raw.company === "string"
          ? raw.company.trim().slice(0, 160) || null
          : null,
    country:
      typeof raw.country === "string"
        ? raw.country.trim().slice(0, 80) || null
        : null,
    bio,
    photoUrl:
      typeof raw.photoUrl === "string"
        ? raw.photoUrl
        : typeof raw.imageUrl === "string"
          ? raw.imageUrl
          : null,
    linkedInUrl: linkedIn,
    websiteUrl: website,
    featured: Boolean(raw.featured),
    hidden: Boolean(raw.hidden),
    sortOrder: typeof raw.order === "number" ? raw.order : index,
  };
}
