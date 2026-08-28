import "server-only";

import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { parseBadgeConfig } from "@/modules/badges/config";
import {
  type EventSponsorRecord,
  type EventSponsorTierGroup,
  groupSponsorsByTier,
  parseSponsorTier,
} from "./config";

export type { EventSponsorRecord, EventSponsorTierGroup };

function mapSponsor(row: {
  id: string;
  name: string;
  websiteUrl: string | null;
  tier: string;
  logoUrl: string | null;
  sortOrder: number;
}): EventSponsorRecord {
  return {
    id: row.id,
    name: row.name,
    websiteUrl: row.websiteUrl,
    tier: parseSponsorTier(row.tier),
    logoUrl: row.logoUrl,
    sortOrder: row.sortOrder,
  };
}

export async function listEventSponsors(
  organisationId: string,
  eventId: string,
): Promise<EventSponsorRecord[]> {
  const rows = await prisma.eventSponsor.findMany({
    where: { organisationId, eventId },
    orderBy: [{ tier: "asc" }, { sortOrder: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      websiteUrl: true,
      tier: true,
      logoUrl: true,
      sortOrder: true,
    },
  });
  return rows.map(mapSponsor);
}

export async function listEventSponsorsGrouped(
  organisationId: string,
  eventId: string,
  options?: Parameters<typeof groupSponsorsByTier>[1],
): Promise<EventSponsorTierGroup[]> {
  const sponsors = await loadEventSponsorsForEvent(organisationId, eventId);
  return groupSponsorsByTier(sponsors, options);
}

/**
 * One-time import of legacy badge-config sponsors into EventSponsor rows.
 * Preserves ids so selectedSponsorIds in badge config keep working.
 */
export async function migrateBadgeSponsorsIfNeeded(
  organisationId: string,
  eventId: string,
): Promise<void> {
  const existingCount = await prisma.eventSponsor.count({
    where: { organisationId, eventId },
  });
  if (existingCount > 0) return;

  const event = await prisma.event.findFirst({
    where: { id: eventId, organisationId },
    select: { settings: { select: { badgeConfig: true } } },
  });
  if (!event?.settings?.badgeConfig) return;

  const config = parseBadgeConfig(event.settings.badgeConfig);
  if (config.sponsors.length === 0) return;

  const data: Prisma.EventSponsorCreateManyInput[] = config.sponsors.map(
    (sponsor, index) => ({
      id: sponsor.id,
      organisationId,
      eventId,
      name: sponsor.name,
      logoUrl: sponsor.url,
      tier: "GOLD",
      sortOrder: index,
    }),
  );

  await prisma.eventSponsor.createMany({ data, skipDuplicates: true });
}

export async function loadEventSponsorsForEvent(
  organisationId: string,
  eventId: string,
): Promise<EventSponsorRecord[]> {
  await migrateBadgeSponsorsIfNeeded(organisationId, eventId);
  return listEventSponsors(organisationId, eventId);
}

export async function nextSortOrderInTier(
  organisationId: string,
  eventId: string,
  tier: EventSponsorRecord["tier"],
): Promise<number> {
  const last = await prisma.eventSponsor.findFirst({
    where: { organisationId, eventId, tier },
    orderBy: { sortOrder: "desc" },
    select: { sortOrder: true },
  });
  return (last?.sortOrder ?? -1) + 1;
}
