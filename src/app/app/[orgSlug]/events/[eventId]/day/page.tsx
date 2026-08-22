import { requireEvent } from "@/lib/authz/require";
import { safe } from "@/lib/authz/safe";
import { EventDayCheckIn } from "@/components/event-day-check-in";

export default async function EventDayPage({
  params,
}: PageProps<"/app/[orgSlug]/events/[eventId]/day">) {
  const { orgSlug, eventId } = await params;
  await safe(() => requireEvent(orgSlug, eventId, "checkin.perform"));

  return <EventDayCheckIn orgSlug={orgSlug} eventId={eventId} />;
}
