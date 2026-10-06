import { prisma } from "@/lib/db/prisma";
import { requireEvent } from "@/lib/authz/require";
import { safe } from "@/lib/authz/safe";
import { hasPermission } from "@/lib/authz/permissions";
import { resolveEmailBranding } from "@/modules/communications/email-branding";
import {
  parseEmailHeroBackgroundMode,
  parseEmailHeroGradientStyle,
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
          websiteConfig: true,
          emailHeroOverlayEnabled: true,
          emailHeroBackgroundMode: true,
          emailHeroGradientStyle: true,
          emailHeroEyebrow: true,
          emailHeroTitle: true,
          emailHeroDetail: true,
          emailHeroClosing: true,
          emailHeroImageUrl: true,
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
      hero={{
        enabled: event?.settings?.emailHeroOverlayEnabled ?? false,
        backgroundMode: parseEmailHeroBackgroundMode(
          event?.settings?.emailHeroBackgroundMode,
        ),
        gradientStyle: parseEmailHeroGradientStyle(
          event?.settings?.emailHeroGradientStyle,
        ),
        eyebrow: event?.settings?.emailHeroEyebrow ?? "",
        title: event?.settings?.emailHeroTitle ?? "",
        detail: event?.settings?.emailHeroDetail ?? "",
        closing: event?.settings?.emailHeroClosing ?? "",
        imageUrl: event?.settings?.emailHeroImageUrl ?? null,
      }}
    />
  );
}
