import { prisma } from "@/lib/db/prisma";
import { requireEvent } from "@/lib/authz/require";
import { safe } from "@/lib/authz/safe";
import { EventSubnav } from "@/components/event-subnav";
import { getAppUrl } from "@/lib/utils";
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
      settings: {
        select: {
          invitationExpiryDays: true,
          capacity: true,
          waitlistEnabled: true,
          allowPublicApplication: true,
        },
      },
    },
  });
  if (!event) return null;

  return (
    <div>
      <EventSubnav
        orgSlug={orgSlug}
        eventId={eventId}
        current="Settings"
        grants={ctx.grants}
      />
      <EventSettingsForm
        orgSlug={orgSlug}
        eventId={eventId}
        applyUrl={`${getAppUrl()}/a/${orgSlug}/${event.slug}`}
        settings={{
          invitationExpiryDays: event.settings?.invitationExpiryDays ?? 30,
          capacity: event.settings?.capacity ?? null,
          waitlistEnabled: event.settings?.waitlistEnabled ?? false,
          allowPublicApplication: event.settings?.allowPublicApplication ?? false,
        }}
      />
    </div>
  );
}
