import Link from "next/link";
import { requireEvent } from "@/lib/authz/require";
import { safe } from "@/lib/authz/safe";
import { EventDayCheckIn } from "@/components/event-day-check-in";

export default async function EventDayPage({
  params,
}: PageProps<"/app/[orgSlug]/events/[eventId]/day">) {
  const { orgSlug, eventId } = await params;
  await safe(() => requireEvent(orgSlug, eventId, "checkin.perform"));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white px-4 py-3 shadow-sm">
        <p className="text-sm text-slate-600">
          Event-day staff: check-in (online or offline pack), delegate lookup,
          and today&apos;s meetings.
        </p>
        <Link
          href={`/app/${orgSlug}/events/${eventId}/meetings?tab=today`}
          className="inline-flex rounded-full bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700"
        >
          Today&apos;s meetings
        </Link>
      </div>
      <EventDayCheckIn orgSlug={orgSlug} eventId={eventId} />
    </div>
  );
}
