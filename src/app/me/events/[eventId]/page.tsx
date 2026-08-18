import Link from "next/link";
import { Card, DecisionCard } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AttendeeEventNav } from "@/components/attendee-event-nav";
import { getMyAttendance } from "@/modules/attendees/actions";
import { requireUser } from "@/lib/authz/require";
import { safe } from "@/lib/authz/safe";
import { formatEventWindow } from "@/lib/utils";

export default async function AttendeeEventPage({
  params,
}: PageProps<"/me/events/[eventId]">) {
  const { eventId } = await params;
  await safe(() => requireUser());
  const attendance = await safe(() => getMyAttendance(eventId));
  const checkedInAt = attendance.checkIns[0]?.checkedInAt ?? null;

  return (
    <div className="space-y-6">
      <AttendeeEventNav eventId={eventId} current="Overview" />
      <DecisionCard>
        <p className="text-xs uppercase tracking-[0.18em] text-bloom-200">
          My event
        </p>
        <h1 className="mt-2 font-display text-4xl">{attendance.event.name}</h1>
        <p className="mt-2 text-ink-100">
          {attendance.event.venue || "Venue TBC"} ·{" "}
          {formatEventWindow(
            attendance.event.startsAt,
            attendance.event.endsAt,
            attendance.event.timezone,
          )}
        </p>
      </DecisionCard>
      <Card>
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="font-display text-2xl text-ink-800">Registration</h2>
          <Badge tone={attendance.status === "CHECKED_IN" ? "success" : "default"}>
            {attendance.status.replaceAll("_", " ")}
          </Badge>
        </div>
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-stone-500">Name</dt>
            <dd className="text-ink-800">
              {attendance.firstName} {attendance.lastName}
            </dd>
          </div>
          <div>
            <dt className="text-stone-500">Company</dt>
            <dd className="text-ink-800">{attendance.company || "—"}</dd>
          </div>
          <div>
            <dt className="text-stone-500">Category</dt>
            <dd className="text-ink-800">{attendance.category?.name || "—"}</dd>
          </div>
          <div>
            <dt className="text-stone-500">Form status</dt>
            <dd className="text-ink-800">
              {attendance.registration?.status ?? "COMPLETED"}
            </dd>
          </div>
        </dl>
        {checkedInAt ? (
          <p className="mt-4 text-sm text-moss-600">
            Checked in {checkedInAt.toLocaleString()}
          </p>
        ) : null}
        <Link
          href={`/me/events/${eventId}/qr`}
          className="mt-6 inline-flex rounded-sm bg-ink-700 px-4 py-2 text-sm font-medium text-white"
        >
          Show my QR code
        </Link>
      </Card>
      {attendance.event.description ? (
        <Card>
          <h2 className="font-display text-2xl text-ink-800">About</h2>
          <p className="mt-3 whitespace-pre-wrap text-sm text-stone-700">
            {attendance.event.description}
          </p>
        </Card>
      ) : null}
    </div>
  );
}
