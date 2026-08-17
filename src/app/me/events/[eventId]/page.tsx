import Link from "next/link";
import { Card, DecisionCard } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
      <DecisionCard>
        <p className="text-xs uppercase tracking-[0.18em] text-accent-200">
          My event
        </p>
        <h1 className="mt-2 font-serif text-4xl">{attendance.event.name}</h1>
        <p className="mt-2 text-primary-100">
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
          <h2 className="font-serif text-2xl text-slate-900">Registration</h2>
          <Badge tone={attendance.status === "CHECKED_IN" ? "success" : "slate"}>
            {attendance.status.replaceAll("_", " ")}
          </Badge>
        </div>
        <dl className="mt-4 grid gap-3 sm:grid-cols-2 text-sm">
          <div>
            <dt className="text-slate-500">Name</dt>
            <dd className="text-slate-900">
              {attendance.firstName} {attendance.lastName}
            </dd>
          </div>
          <div>
            <dt className="text-slate-500">Company</dt>
            <dd className="text-slate-900">{attendance.company || "—"}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Category</dt>
            <dd className="text-slate-900">{attendance.category?.name || "—"}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Form status</dt>
            <dd className="text-slate-900">
              {attendance.registration?.status ?? "COMPLETED"}
            </dd>
          </div>
        </dl>
        {checkedInAt ? (
          <p className="mt-4 text-sm text-success-500">
            Checked in {checkedInAt.toLocaleString()}
          </p>
        ) : null}
        <Link
          href={`/me/events/${eventId}/qr`}
          className="mt-6 inline-flex rounded-full bg-primary-600 px-4 py-2 text-sm text-white"
        >
          Show my QR code
        </Link>
      </Card>
      {attendance.event.description ? (
        <Card>
          <h2 className="font-serif text-2xl text-slate-900">About</h2>
          <p className="mt-3 whitespace-pre-wrap text-sm text-slate-600">
            {attendance.event.description}
          </p>
        </Card>
      ) : null}
      <Card className="bg-secondary-100">
        <p className="text-sm font-medium text-slate-500">Matchmaking</p>
        <p className="mt-1 text-sm text-slate-400">
          Profile matching and meetings are not enabled in this phase.
        </p>
      </Card>
    </div>
  );
}
