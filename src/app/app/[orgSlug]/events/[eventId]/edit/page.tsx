import { prisma } from "@/lib/db/prisma";
import { requireEvent } from "@/lib/authz/require";
import { safe } from "@/lib/authz/safe";
import { RouteDrawer } from "@/components/ui/drawer";
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
    <RouteDrawer
      title="Edit event"
      description="Update the event name, dates, venue, timezone, and descriptive details."
      closeHref={`/app/${orgSlug}/events/${eventId}`}
      size="lg"
    >
      <EventEditForm orgSlug={orgSlug} eventId={eventId} event={event} />
    </RouteDrawer>
  );
}
