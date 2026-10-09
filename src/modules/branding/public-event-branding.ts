import "server-only";

import { prisma } from "@/lib/db/prisma";
import {
  brandHeadingCssFamily,
  brandHeadingCssLineHeight,
  brandHeadingCssTextAlign,
  brandHeadingCssTracking,
  brandHeadingCssWeight,
  objectPositionCss,
  parseFocalPercent,
  resolveBrandHeadingStyle,
  type BrandHeadingStyle,
} from "@/modules/branding/brand-heading-style";
import { parsePhotoZoom } from "@/modules/branding/cover-focal";
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
  focalX: number;
  focalY: number;
  /** Photo zoom percent 100–200. */
  zoom: number;
  objectPosition: string;
  gradientStyle: EmailHeroGradientStyle;
  gradientCss: string;
};

export type PublicEventBranding = EmailBranding & {
  eventName: string;
  orgName: string;
  venue: string | null;
  timezone: string;
  banner: PublicBannerBranding;
  heading: BrandHeadingStyle & {
    cssFamily: string;
    cssWeight: number;
    cssTracking: string;
    cssLineHeight: number;
    cssTextAlign: "left" | "center";
  };
};

/** Fallback when branding cannot be loaded (cancelled invites, etc.). */
export function defaultPublicBanner(): PublicBannerBranding {
  return {
    mode: "COLOR",
    imageUrl: null,
    blur: 0,
    focalX: 50,
    focalY: 50,
    zoom: 100,
    objectPosition: objectPositionCss(50, 50),
    gradientStyle: "indigo",
    gradientCss: gradientPreset("indigo").css,
  };
}

export function defaultPublicHeading(): PublicEventBranding["heading"] {
  const heading = resolveBrandHeadingStyle({});
  return {
    ...heading,
    cssFamily: brandHeadingCssFamily(heading.font),
    cssWeight: brandHeadingCssWeight(heading.weight),
    cssTracking: brandHeadingCssTracking(heading.tracking),
    cssLineHeight: brandHeadingCssLineHeight(heading.lineHeight),
    cssTextAlign: brandHeadingCssTextAlign(heading.align),
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
          emailBannerFocalX: true,
          emailBannerFocalY: true,
          emailBannerZoom: true,
          brandHeadingColor: true,
          brandHeadingColorPublic: true,
          brandHeadingFont: true,
          brandHeadingSize: true,
          brandHeadingWeight: true,
          brandHeadingTracking: true,
          brandHeadingAlign: true,
          brandHeadingLineHeight: true,
          brandHeadingEyebrowUppercase: true,
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

  const focalX = parseFocalPercent(event.settings?.emailBannerFocalX, 50);
  const focalY = parseFocalPercent(event.settings?.emailBannerFocalY, 50);
  const zoom = parsePhotoZoom(event.settings?.emailBannerZoom, 100);
  const publicColor =
    event.settings?.brandHeadingColorPublic ??
    (event.settings?.brandHeadingColor === "#FFFFFF" ||
    event.settings?.brandHeadingColor === "#FFF"
      ? "#0F172A"
      : event.settings?.brandHeadingColor);
  const heading = resolveBrandHeadingStyle({
    color: publicColor,
    font: event.settings?.brandHeadingFont,
    size: event.settings?.brandHeadingSize,
    weight: event.settings?.brandHeadingWeight,
    tracking: event.settings?.brandHeadingTracking,
    align: event.settings?.brandHeadingAlign,
    lineHeight: event.settings?.brandHeadingLineHeight,
    eyebrowUppercase: event.settings?.brandHeadingEyebrowUppercase,
  });

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
      focalX,
      focalY,
      zoom,
      objectPosition: objectPositionCss(focalX, focalY),
      gradientStyle,
      gradientCss: gradientPreset(gradientStyle).css,
    },
    heading: {
      ...heading,
      cssFamily: brandHeadingCssFamily(heading.font),
      cssWeight: brandHeadingCssWeight(heading.weight),
      cssTracking: brandHeadingCssTracking(heading.tracking),
      cssLineHeight: brandHeadingCssLineHeight(heading.lineHeight),
      cssTextAlign: brandHeadingCssTextAlign(heading.align),
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
