import "server-only";

import { prisma } from "@/lib/db/prisma";
import {
  emailSafeImageUrl,
  resolveEmailBranding,
  type EmailBranding,
} from "@/modules/communications/email-branding";
import {
  gradientPreset,
  parseBannerBlur,
  parseEmailHeroBackgroundMode,
  parseEmailHeroGradientStyle,
  type EmailHeroBackgroundMode,
  type EmailHeroGradientStyle,
} from "@/modules/communications/invite-hero-background";

export type PublicBannerBranding = {
  mode: EmailHeroBackgroundMode;
  /** Photo URL when mode is IMAGE */
  imageUrl: string | null;
  blur: number;
  gradientStyle: EmailHeroGradientStyle;
  gradientCss: string;
};

export type PublicEventBranding = EmailBranding & {
  eventName: string;
  orgName: string;
  venue: string | null;
  timezone: string;
  banner: PublicBannerBranding;
};

/** Fallback when branding cannot be loaded (cancelled invites, etc.). */
export function defaultPublicBanner(): PublicBannerBranding {
  return {
    mode: "COLOR",
    imageUrl: null,
    blur: 0,
    gradientStyle: "indigo",
    gradientCss: gradientPreset("indigo").css,
  };
}

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
          emailBannerMode: true,
          emailBannerGradientStyle: true,
          emailBannerBlur: true,
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

  const mode = parseEmailHeroBackgroundMode(event.settings?.emailBannerMode);
  const gradientStyle = parseEmailHeroGradientStyle(
    event.settings?.emailBannerGradientStyle,
  );
  const imageUrl = emailSafeImageUrl(event.settings?.emailBannerUrl);
  // If mode is IMAGE but no photo, fall back to colour so pages never look broken.
  const resolvedMode: EmailHeroBackgroundMode =
    mode === "IMAGE" && !imageUrl ? "COLOR" : mode;

  return {
    ...branding,
    // Keep legacy bannerUrl for callers that only show a photo strip.
    bannerUrl: resolvedMode === "IMAGE" ? imageUrl : null,
    eventName: event.name,
    orgName: event.organisation.name,
    venue: event.venue,
    timezone: event.timezone,
    banner: {
      mode: resolvedMode,
      imageUrl,
      blur: parseBannerBlur(event.settings?.emailBannerBlur, 0),
      gradientStyle,
      gradientCss: gradientPreset(gradientStyle).css,
    },
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
