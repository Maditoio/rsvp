import "server-only";

import { prisma } from "@/lib/db/prisma";
import { formatSessionSchedule } from "@/lib/session-schedule";
import {
  eventSiteConfigFromEvent,
  parseEventSiteConfig,
  type EventSiteConfig,
} from "./config";
import {
  groupSponsorsByTier,
  type EventSponsorTierGroup,
} from "@/modules/sponsors/config";
import { loadEventSponsorsForEvent } from "@/modules/sponsors/service";

export type EventSiteSessionPreview = {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  dateLabel: string;
  timeLabel: string | null;
};

export type PublishedEventSite = {
  orgSlug: string;
  orgName: string;
  eventSlug: string;
  eventName: string;
  venue: string | null;
  startsAt: Date | null;
  endsAt: Date | null;
  timezone: string;
  logoUrl: string | null;
  allowPublicApplication: boolean;
  websiteConfig: EventSiteConfig;
  websitePublishedAt: Date;
  sessions: EventSiteSessionPreview[];
  sponsorGroups: EventSponsorTierGroup[];
  applyUrl: string | null;
  publicUrl: string;
};

export type EventWebsiteSettings = {
  config: EventSiteConfig;
  websitePublishedAt: Date | null;
  sponsorGroups: EventSponsorTierGroup[];
  event: {
    name: string;
    slug: string;
    description: string | null;
    venue: string | null;
    startsAt: Date | null;
    endsAt: Date | null;
    timezone: string;
    logoUrl: string | null;
    allowPublicApplication: boolean;
  };
};

function mapSessions(
  sessions: {
    id: string;
    title: string;
    description: string | null;
    startsAt: Date | null;
    endsAt: Date | null;
    location: string | null;
  }[],
  timezone: string,
  maxSessions: number,
): EventSiteSessionPreview[] {
  return sessions.slice(0, maxSessions).map((s) => {
    const schedule = formatSessionSchedule(s.startsAt, s.endsAt, timezone);
    return {
      id: s.id,
      title: s.title,
      description: s.description,
      location: s.location,
      dateLabel: schedule.dateLabel,
      timeLabel: schedule.timeLabel,
    };
  });
}

export async function loadEventWebsiteSettings(
  organisationId: string,
  eventId: string,
): Promise<EventWebsiteSettings | null> {
  const event = await prisma.event.findFirst({
    where: { id: eventId, organisationId },
    select: {
      name: true,
      slug: true,
      description: true,
      venue: true,
      startsAt: true,
      endsAt: true,
      timezone: true,
      logoUrl: true,
      settings: {
        select: {
          allowPublicApplication: true,
          websiteConfig: true,
          websitePublishedAt: true,
        },
      },
    },
  });
  if (!event) return null;

  const sponsors = await loadEventSponsorsForEvent(organisationId, eventId);
  const sponsorGroups = groupSponsorsByTier(sponsors);

  const rawConfig = parseEventSiteConfig(event.settings?.websiteConfig);
  const config = eventSiteConfigFromEvent({
    name: event.name,
    description: event.description,
    venue: event.venue,
    logoUrl: event.logoUrl,
    config: rawConfig,
  });

  return {
    config,
    websitePublishedAt: event.settings?.websitePublishedAt ?? null,
    sponsorGroups,
    event: {
      name: event.name,
      slug: event.slug,
      description: event.description,
      venue: event.venue,
      startsAt: event.startsAt,
      endsAt: event.endsAt,
      timezone: event.timezone,
      logoUrl: event.logoUrl,
      allowPublicApplication:
        event.settings?.allowPublicApplication ?? false,
    },
  };
}

export async function loadPublishedEventSite(
  orgSlug: string,
  eventSlug: string,
  options?: { preview?: boolean; organisationId?: string },
): Promise<PublishedEventSite | null> {
  const event = await prisma.event.findFirst({
    where: { slug: eventSlug, organisation: { slug: orgSlug } },
    include: {
      organisation: { select: { id: true, name: true, slug: true } },
      settings: true,
    },
  });
  if (!event?.settings) return null;

  const isPreview = options?.preview === true;
  const isPublished = Boolean(event.settings.websitePublishedAt);

  if (!isPublished && !isPreview) return null;
  if (
    isPreview &&
    options?.organisationId &&
    event.organisationId !== options.organisationId
  ) {
    return null;
  }

  const rawConfig = parseEventSiteConfig(event.settings.websiteConfig);
  const config = eventSiteConfigFromEvent({
    name: event.name,
    description: event.description,
    venue: event.venue,
    logoUrl: event.logoUrl,
    config: rawConfig,
  });

  const agendaSection = config.sections.find((s) => s.type === "agenda");
  const agendaEnabled = agendaSection?.enabled ?? false;
  const maxSessions =
    typeof agendaSection?.content.maxSessions === "number"
      ? agendaSection.content.maxSessions
      : 8;

  const sessions = agendaEnabled
    ? await prisma.session.findMany({
        where: { eventId: event.id, organisationId: event.organisationId },
        orderBy: [{ startsAt: "asc" }, { title: "asc" }],
        select: {
          id: true,
          title: true,
          description: true,
          startsAt: true,
          endsAt: true,
          location: true,
        },
      })
    : [];

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "";
  const publicUrl = `${baseUrl}/e/${orgSlug}/${eventSlug}`;
  const applyUrl = event.settings.allowPublicApplication
    ? `${baseUrl}/a/${orgSlug}/${eventSlug}`
    : null;

  const sponsors = await loadEventSponsorsForEvent(
    event.organisationId,
    event.id,
  );
  const sponsorGroups = groupSponsorsByTier(sponsors);

  return {
    orgSlug,
    orgName: event.organisation.name,
    eventSlug,
    eventName: event.name,
    venue: event.venue,
    startsAt: event.startsAt,
    endsAt: event.endsAt,
    timezone: event.timezone,
    logoUrl: event.logoUrl,
    allowPublicApplication: event.settings.allowPublicApplication,
    websiteConfig: config,
    websitePublishedAt:
      event.settings.websitePublishedAt ?? new Date(),
    sessions: mapSessions(sessions, event.timezone, maxSessions),
    sponsorGroups,
    applyUrl,
    publicUrl,
  };
}
