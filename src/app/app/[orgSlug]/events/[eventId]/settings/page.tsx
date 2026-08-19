import { prisma } from "@/lib/db/prisma";
import { requireEvent } from "@/lib/authz/require";
import { safe } from "@/lib/authz/safe";
import { getAppUrl } from "@/lib/utils";
import { urlQrDataUrl } from "@/lib/qr";
import { EventSettingsForm } from "./event-settings-form";

export default async function EventSettingsPage({
  params,
}: PageProps<"/app/[orgSlug]/events/[eventId]/settings">) {
  const { orgSlug, eventId } = await params;
  const ctx = await safe(() => requireEvent(orgSlug, eventId, "event.update"));
  const event = await prisma.event.findFirst({
    where: { id: eventId, organisationId: ctx.organisation.id },
    select: {
      name: true,
      slug: true,
      settings: true,
    },
  });
  if (!event) return null;

  const applyUrl = `${getAppUrl()}/a/${orgSlug}/${event.slug}`;
  const allowPublicApplication =
    event.settings?.allowPublicApplication ?? false;
  const applyQr = allowPublicApplication
    ? await urlQrDataUrl(applyUrl)
    : null;

  return (
    <div>
      <EventSettingsForm
        orgSlug={orgSlug}
        eventId={eventId}
        applyUrl={applyUrl}
        applyQrDataUrl={applyQr}
        settings={{
          invitationExpiryDays: event.settings?.invitationExpiryDays ?? 30,
          capacity: event.settings?.capacity ?? null,
          waitlistEnabled: event.settings?.waitlistEnabled ?? false,
          allowPublicApplication,
          aiInsightsEnabled: event.settings?.aiInsightsEnabled ?? false,
        }}
      />
    </div>
  );
}
