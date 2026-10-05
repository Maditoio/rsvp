import "server-only";

import { prisma } from "@/lib/db/prisma";
import {
  resolveEmailBranding,
  type EmailBranding,
} from "@/modules/communications/email-branding";

export type PublicEventBranding = EmailBranding & {
  eventName: string;
  orgName: string;
  venue: string | null;
  timezone: string;
};

export async function loadPublicEventBrandingByIds(input: {
  organisationId: string;
  eventId: string;
}): Promise<PublicEventBranding | null> {
  const event = await prisma.event.findFirst({
    where: {
      id: input.eventId,
      organisationId: input.organisationId,
    },
    select: {
      name: true,
      venue: true,
      timezone: true,
      logoUrl: true,
      organisation: { select: { name: true } },
      settings: {
        select: {
          emailAccentColor: true,
          emailBannerUrl: true,
          websiteConfig: true,
        },
      },
    },
  });
  if (!event) return null;

  const branding = resolveEmailBranding({
    logoUrl: event.logoUrl,
    bannerUrl: event.settings?.emailBannerUrl,
    emailAccentColor: event.settings?.emailAccentColor,
    websiteConfig: event.settings?.websiteConfig,
  });

  return {
    ...branding,
    eventName: event.name,
    orgName: event.organisation.name,
    venue: event.venue,
    timezone: event.timezone,
  };
}

export async function loadPublicEventBrandingBySlugs(input: {
  orgSlug: string;
  eventSlug: string;
}): Promise<PublicEventBranding | null> {
  const event = await prisma.event.findFirst({
    where: {
      slug: input.eventSlug,
      organisation: { slug: input.orgSlug },
    },
    select: {
      id: true,
      organisationId: true,
    },
  });
  if (!event) return null;
  return loadPublicEventBrandingByIds({
    organisationId: event.organisationId,
    eventId: event.id,
  });
}
