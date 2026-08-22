import { requireEvent } from "@/lib/authz/require";
import { safe } from "@/lib/authz/safe";
import { EventDayLookup } from "@/components/event-day-lookup";

export default async function EventDayLookupPage({
  params,
}: PageProps<"/app/[orgSlug]/events/[eventId]/day/lookup">) {
  const { orgSlug, eventId } = await params;
  await safe(() => requireEvent(orgSlug, eventId, "checkin.perform"));

  return <EventDayLookup orgSlug={orgSlug} eventId={eventId} />;
}
