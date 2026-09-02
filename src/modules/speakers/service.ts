import "server-only";

import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { parseEventSiteConfig } from "@/modules/event-sites/config";
import {
  legacyWebsiteSpeakerToRecord,
  type EventSpeakerRecord,
} from "./config";

export type { EventSpeakerRecord };

function mapSpeaker(row: {
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
}): EventSpeakerRecord {
  return {
    id: row.id,
    firstName: row.firstName,
    lastName: row.lastName,
    jobTitle: row.jobTitle,
    organization: row.organization,
    country: row.country,
    bio: row.bio,
    photoUrl: row.photoUrl,
    linkedInUrl: row.linkedInUrl,
    websiteUrl: row.websiteUrl,
    featured: row.featured,
    hidden: row.hidden,
    sortOrder: row.sortOrder,
  };
}

const speakerSelect = {
  id: true,
  firstName: true,
  lastName: true,
  jobTitle: true,
  organization: true,
  country: true,
  bio: true,
  photoUrl: true,
  linkedInUrl: true,
  websiteUrl: true,
  featured: true,
  hidden: true,
  sortOrder: true,
} as const;

export async function listEventSpeakers(
  organisationId: string,
  eventId: string,
): Promise<EventSpeakerRecord[]> {
  const rows = await prisma.eventSpeaker.findMany({
    where: { organisationId, eventId },
    orderBy: [{ sortOrder: "asc" }, { firstName: "asc" }, { lastName: "asc" }],
    select: speakerSelect,
  });
  return rows.map(mapSpeaker);
}

/**
 * One-time import of speakers embedded in websiteConfig into EventSpeaker rows.
 * Preserves legacy ids so re-running is idempotent via skipDuplicates.
 */
export async function migrateWebsiteSpeakersIfNeeded(
  organisationId: string,
  eventId: string,
): Promise<number> {
  const existingCount = await prisma.eventSpeaker.count({
    where: { organisationId, eventId },
  });
  if (existingCount > 0) return 0;

  const event = await prisma.event.findFirst({
    where: { id: eventId, organisationId },
    select: { settings: { select: { websiteConfig: true } } },
  });
  if (!event?.settings?.websiteConfig) return 0;

  const config = parseEventSiteConfig(event.settings.websiteConfig);
  const speakersSection = config.sections.find((s) => s.type === "speakers");
  const items = speakersSection?.content?.items;
  if (!Array.isArray(items) || items.length === 0) return 0;

  const data: Prisma.EventSpeakerCreateManyInput[] = items.map((item, index) => {
    const mapped = legacyWebsiteSpeakerToRecord(
      item as Record<string, unknown>,
      index,
    );
    return {
      id: mapped.id,
      organisationId,
      eventId,
      firstName: mapped.firstName,
      lastName: mapped.lastName,
      jobTitle: mapped.jobTitle,
      organization: mapped.organization,
      country: mapped.country,
      bio: mapped.bio,
      photoUrl: mapped.photoUrl,
      linkedInUrl: mapped.linkedInUrl,
      websiteUrl: mapped.websiteUrl,
      featured: mapped.featured,
      hidden: mapped.hidden,
      sortOrder: mapped.sortOrder,
    };
  });

  const result = await prisma.eventSpeaker.createMany({
    data,
    skipDuplicates: true,
  });
  return result.count;
}

export async function loadEventSpeakersForEvent(
  organisationId: string,
  eventId: string,
): Promise<EventSpeakerRecord[]> {
  await migrateWebsiteSpeakersIfNeeded(organisationId, eventId);
  return listEventSpeakers(organisationId, eventId);
}

export async function nextSpeakerSortOrder(
  organisationId: string,
  eventId: string,
): Promise<number> {
  const last = await prisma.eventSpeaker.findFirst({
    where: { organisationId, eventId },
    orderBy: { sortOrder: "desc" },
    select: { sortOrder: true },
  });
  return (last?.sortOrder ?? -1) + 1;
}
