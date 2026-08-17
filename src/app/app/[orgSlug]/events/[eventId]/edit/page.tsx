import { prisma } from "@/lib/db/prisma";
import { requireEvent } from "@/lib/authz/require";
import { safe } from "@/lib/authz/safe";
import { EventSubnav } from "@/components/event-subnav";
import { EventEditForm } from "./event-edit-form";

export default async function EventEditPage({
  params,
}: PageProps<"/app/[orgSlug]/events/[eventId]/edit">) {
  const { orgSlug, eventId } = await params;
  const ctx = await safe(() => requireEvent(orgSlug, eventId, "event.update"));
  const event = await prisma.event.findFirst({
    where: { id: eventId, organisationId: ctx.organisation.id },
    select: {
      name: true,
      description: true,
      venue: true,
      timezone: true,
      startsAt: true,
      endsAt: true,
      website: true,
    },
  });
  if (!event) return null;

  return (
    <div>
      <EventSubnav
        orgSlug={orgSlug}
        eventId={eventId}
        current="Dashboard"
        grants={ctx.grants}
      />
      <EventEditForm orgSlug={orgSlug} eventId={eventId} event={event} />
    </div>
  );
}
