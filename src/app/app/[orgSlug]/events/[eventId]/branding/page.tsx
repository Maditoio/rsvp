import { prisma } from "@/lib/db/prisma";
import { requireEvent } from "@/lib/authz/require";
import { safe } from "@/lib/authz/safe";
import { hasPermission } from "@/lib/authz/permissions";
import {
  parseFocalPercent,
  resolveBrandHeadingStyle,
} from "@/modules/branding/brand-heading-style";
import { parsePhotoZoom } from "@/modules/branding/cover-focal";
import { resolveEmailBranding } from "@/modules/communications/email-branding";
import {
  parseBannerBlur,
  parseEmailHeroBackgroundMode,
  parseEmailHeroGradientStyle,
  parseHeroBlur,
  parseHeroOverlay,
} from "@/modules/communications/invite-hero-background";
import { BrandingPanel } from "./branding-panel";

export default async function BrandingPage({
  params,
}: PageProps<"/app/[orgSlug]/events/[eventId]/branding">) {
  const { orgSlug, eventId } = await params;
  const ctx = await safe(() => requireEvent(orgSlug, eventId, "event.read"));
  const event = await prisma.event.findFirst({
    where: { id: eventId, organisationId: ctx.organisation.id },
    select: {
      name: true,
      logoUrl: true,
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
          websiteConfig: true,
          emailHeroOverlayEnabled: true,
          emailHeroPhotoUrl: true,
          emailHeroBackgroundMode: true,
          emailHeroGradientStyle: true,
          emailHeroBlur: true,
          emailHeroOverlay: true,
          emailHeroFocalX: true,
          emailHeroFocalY: true,
          emailHeroZoom: true,
          emailHeroEyebrow: true,
          emailHeroTitle: true,
          emailHeroDetail: true,
          emailHeroClosing: true,
          emailHeroImageUrl: true,
          brandHeadingColor: true,
          brandHeadingFont: true,
          brandHeadingSize: true,
          brandHeadingWeight: true,
          brandHeadingTracking: true,
          brandHeadingAlign: true,
          brandHeadingLineHeight: true,
          brandHeadingEyebrowUppercase: true,
        },
      },
    },
  });

  const branding = resolveEmailBranding({
    logoUrl: event?.logoUrl,
    bannerUrl: event?.settings?.emailBannerUrl,
    emailAccentColor: event?.settings?.emailAccentColor,
    websiteConfig: event?.settings?.websiteConfig,
    heroOverlayEnabled: event?.settings?.emailHeroOverlayEnabled,
    heroImageUrl: event?.settings?.emailHeroImageUrl,
  });

  const heading = resolveBrandHeadingStyle({
    color: event?.settings?.brandHeadingColor,
    font: event?.settings?.brandHeadingFont,
    size: event?.settings?.brandHeadingSize,
    weight: event?.settings?.brandHeadingWeight,
    tracking: event?.settings?.brandHeadingTracking,
    align: event?.settings?.brandHeadingAlign,
    lineHeight: event?.settings?.brandHeadingLineHeight,
    eyebrowUppercase: event?.settings?.brandHeadingEyebrowUppercase,
  });

  return (
    <BrandingPanel
      orgSlug={orgSlug}
      eventId={eventId}
      canEdit={hasPermission(ctx.grants, "event.update")}
      branding={branding}
      emailAccentColor={event?.settings?.emailAccentColor ?? null}
      logoUrl={event?.logoUrl ?? null}
      bannerUrl={event?.settings?.emailBannerUrl ?? null}
      eventName={event?.name ?? "Event"}
      banner={{
        mode: parseEmailHeroBackgroundMode(event?.settings?.emailBannerMode),
        gradientStyle: parseEmailHeroGradientStyle(
          event?.settings?.emailBannerGradientStyle,
        ),
        blur: parseBannerBlur(event?.settings?.emailBannerBlur, 0),
        focalX: parseFocalPercent(event?.settings?.emailBannerFocalX, 50),
        focalY: parseFocalPercent(event?.settings?.emailBannerFocalY, 50),
        zoom: parsePhotoZoom(event?.settings?.emailBannerZoom, 100),
      }}
      hero={{
        enabled: event?.settings?.emailHeroOverlayEnabled ?? false,
        photoUrl: event?.settings?.emailHeroPhotoUrl ?? null,
        backgroundMode: parseEmailHeroBackgroundMode(
          event?.settings?.emailHeroBackgroundMode,
        ),
        gradientStyle: parseEmailHeroGradientStyle(
          event?.settings?.emailHeroGradientStyle,
        ),
        blur: parseHeroBlur(event?.settings?.emailHeroBlur, 6),
        overlay: parseHeroOverlay(event?.settings?.emailHeroOverlay, 55),
        focalX: parseFocalPercent(event?.settings?.emailHeroFocalX, 50),
        focalY: parseFocalPercent(event?.settings?.emailHeroFocalY, 50),
        zoom: parsePhotoZoom(event?.settings?.emailHeroZoom, 100),
        eyebrow: event?.settings?.emailHeroEyebrow ?? "",
        title: event?.settings?.emailHeroTitle ?? "",
        detail: event?.settings?.emailHeroDetail ?? "",
        closing: event?.settings?.emailHeroClosing ?? "",
        imageUrl: event?.settings?.emailHeroImageUrl ?? null,
      }}
      heading={heading}
    />
  );
}
