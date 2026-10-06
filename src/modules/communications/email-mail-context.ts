import "server-only";

import { prisma } from "@/lib/db/prisma";
import { resolveEmailBranding } from "@/modules/communications/email-branding";
import {
  emptyEventMailContext,
  eventMailContextToSnapshot,
  resolveMailContextFromPartial,
  type EventMailContext,
  type EventMailSnapshot,
  type PartialMailInput,
} from "@/modules/communications/email-mail-snapshot";

export type {
  EventMailContext,
  EventMailSnapshot,
} from "@/modules/communications/email-mail-snapshot";
export {
  eventMailContextFromSnapshot,
  eventMailContextToSnapshot,
} from "@/modules/communications/email-mail-snapshot";

const CACHE_TTL_MS = 60_000;
const mailContextCache = new Map<
  string,
  { expiresAt: number; value: EventMailContext }
>();

function cacheKey(organisationId: string, eventId: string) {
  return `${organisationId}:${eventId}`;
}

export function invalidateEventMailContextCache(
  organisationId: string,
  eventId: string,
) {
  mailContextCache.delete(cacheKey(organisationId, eventId));
}

async function fetchEventMailContext(
  organisationId: string,
  eventId: string,
): Promise<EventMailContext> {
  const loaded = await prisma.event.findFirst({
    where: { id: eventId, organisationId },
    select: {
      name: true,
      venue: true,
      timezone: true,
      startsAt: true,
      endsAt: true,
      description: true,
      logoUrl: true,
      organisation: { select: { name: true } },
      settings: {
        select: {
          emailAccentColor: true,
          emailBannerUrl: true,
          emailHeroOverlayEnabled: true,
          emailHeroImageUrl: true,
          websiteConfig: true,
        },
      },
    },
  });

  return {
    eventName: loaded?.name ?? "your event",
    orgName: loaded?.organisation.name ?? "the organiser",
    venue: loaded?.venue ?? null,
    timezone: loaded?.timezone ?? "UTC",
    startsAt: loaded?.startsAt ?? null,
    endsAt: loaded?.endsAt ?? null,
    description: loaded?.description ?? null,
    branding: resolveEmailBranding({
      logoUrl: loaded?.logoUrl,
      bannerUrl: loaded?.settings?.emailBannerUrl,
      emailAccentColor: loaded?.settings?.emailAccentColor,
      websiteConfig: loaded?.settings?.websiteConfig,
      heroOverlayEnabled: loaded?.settings?.emailHeroOverlayEnabled,
      heroImageUrl: loaded?.settings?.emailHeroImageUrl,
    }),
  };
}

/** One DB read per event (cached ~60s in-process). Use for bulk sends. */
export async function loadEventMailContext(
  organisationId: string,
  eventId: string,
): Promise<EventMailContext> {
  const key = cacheKey(organisationId, eventId);
  const hit = mailContextCache.get(key);
  if (hit && hit.expiresAt > Date.now()) {
    return hit.value;
  }

  const value = await fetchEventMailContext(organisationId, eventId);
  mailContextCache.set(key, { expiresAt: Date.now() + CACHE_TTL_MS, value });
  return value;
}

export async function loadEventMailSnapshot(
  organisationId: string,
  eventId: string,
): Promise<EventMailSnapshot> {
  return eventMailContextToSnapshot(
    await loadEventMailContext(organisationId, eventId),
  );
}

/**
 * Prefer `mail` snapshot (no DB). Else merge partials; only hit DB when fields are missing.
 */
export async function resolveEventMailContext(
  organisationId: string,
  eventId: string | undefined,
  partial: PartialMailInput = {},
): Promise<EventMailContext> {
  const fromPartial = resolveMailContextFromPartial(partial);
  if (fromPartial) return fromPartial;

  if (!eventId) {
    return emptyEventMailContext(partial);
  }

  const loaded = await loadEventMailContext(organisationId, eventId);
  return {
    eventName: partial.eventName ?? loaded.eventName,
    orgName: partial.orgName ?? loaded.orgName,
    venue: partial.venue !== undefined ? partial.venue : loaded.venue,
    timezone: partial.timezone ?? loaded.timezone,
    startsAt:
      partial.startsAt !== undefined ? partial.startsAt : loaded.startsAt,
    endsAt: partial.endsAt !== undefined ? partial.endsAt : loaded.endsAt,
    description:
      partial.description !== undefined
        ? partial.description
        : loaded.description,
    branding: partial.branding ?? loaded.branding,
  };
}
