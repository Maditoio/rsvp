import { requireEvent } from "@/lib/authz/require";
import { safe } from "@/lib/authz/safe";
import { EventDayEntranceScan } from "@/components/event-day-entrance-scan";

export default async function EventDayEntrancePage({
  params,
}: PageProps<"/app/[orgSlug]/events/[eventId]/day/entrance">) {
  const { orgSlug, eventId } = await params;
  await safe(() => requireEvent(orgSlug, eventId, "checkin.perform"));

  return <EventDayEntranceScan orgSlug={orgSlug} eventId={eventId} />;
}
