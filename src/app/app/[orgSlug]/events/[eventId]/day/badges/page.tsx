import { requireEvent } from "@/lib/authz/require";
import { safe } from "@/lib/authz/safe";
import { loadBadgePrintQueue } from "@/modules/badges/queue";
import { EventDayBadgeQueue } from "@/components/event-day-badge-queue";

export default async function EventDayBadgesPage({
  params,
}: PageProps<"/app/[orgSlug]/events/[eventId]/day/badges">) {
  const { orgSlug, eventId } = await params;
  const ctx = await safe(() => requireEvent(orgSlug, eventId, "checkin.perform"));
  const rows = await loadBadgePrintQueue(ctx.organisation.id, eventId);

  return (
    <EventDayBadgeQueue orgSlug={orgSlug} eventId={eventId} rows={rows} />
  );
}
