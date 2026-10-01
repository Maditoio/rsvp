import { prisma } from "@/lib/db/prisma";
import { requireEvent } from "@/lib/authz/require";
import { safe } from "@/lib/authz/safe";
import { hasPermission } from "@/lib/authz/permissions";
import { resolveEmailBranding } from "@/modules/communications/email-branding";
import { BrandingPanel } from "./branding-panel";

export default async function BrandingPage({
  params,
}: PageProps<"/app/[orgSlug]/events/[eventId]/branding">) {
  const { orgSlug, eventId } = await params;
  const ctx = await safe(() => requireEvent(orgSlug, eventId, "event.read"));
  const event = await prisma.event.findFirst({
    where: { id: eventId, organisationId: ctx.organisation.id },
    select: {
      logoUrl: true,
      settings: {
        select: {
          emailAccentColor: true,
          emailBannerUrl: true,
          websiteConfig: true,
        },
      },
    },
  });

  const branding = resolveEmailBranding({
    logoUrl: event?.logoUrl,
    bannerUrl: event?.settings?.emailBannerUrl,
    emailAccentColor: event?.settings?.emailAccentColor,
    websiteConfig: event?.settings?.websiteConfig,
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
    />
  );
}
