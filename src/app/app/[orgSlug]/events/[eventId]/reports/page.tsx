import { requireEvent } from "@/lib/authz/require";
import { safe } from "@/lib/authz/safe";
import { Card } from "@/components/ui/card";

export default async function ReportsPage({
  params,
}: PageProps<"/app/[orgSlug]/events/[eventId]/reports">) {
  const { orgSlug, eventId } = await params;
  const ctx = await safe(() => requireEvent(orgSlug, eventId, "reports.export"));
  const base = `/app/${orgSlug}/events/${eventId}/reports/download`;

  return (
    <div>
      <h1 className="text-3xl font-semibold tracking-[-0.02em] text-slate-900">
        Reports
      </h1>
      <p className="mt-1 mb-6 text-sm text-slate-600">
        CSV exports are permission-gated and written to the audit log. View live
        metrics on{" "}
        <a
          href={`/app/${orgSlug}/events/${eventId}/analytics`}
          className="font-medium text-indigo-600 hover:underline"
        >
          Analytics
        </a>
        .
      </p>
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <h2 className="font-medium text-slate-700">Invitees</h2>
          <p className="mt-1 text-sm text-slate-700">
            Contacts for this event with their latest invitation status.
          </p>
          <a
            href={`${base}?kind=invitees`}
            className="mt-4 inline-flex rounded-full bg-indigo-600 px-4 py-2 text-sm font-medium text-white"
          >
            Download invitees CSV
          </a>
        </Card>
        <Card>
          <h2 className="font-medium text-slate-700">Attendees</h2>
          <p className="mt-1 text-sm text-slate-700">
            Registered attendees. Invitation accepted does not appear here until
            they register.
          </p>
          <a
            href={`${base}?kind=attendees`}
            className="mt-4 inline-flex rounded-full bg-indigo-600 px-4 py-2 text-sm font-medium text-white"
          >
            Download attendees CSV
          </a>
        </Card>
        <Card>
          <h2 className="font-medium text-slate-700">Check-ins</h2>
          <p className="mt-1 text-sm text-slate-700">
            Attendees who have checked in, with timestamps.
          </p>
          <a
            href={`${base}?kind=checkins`}
            className="mt-4 inline-flex rounded-full bg-indigo-600 px-4 py-2 text-sm font-medium text-white"
          >
            Download check-ins CSV
          </a>
        </Card>
        <Card>
          <h2 className="font-medium text-slate-700">Meetings</h2>
          <p className="mt-1 text-sm text-slate-700">
            Meeting requests and scheduled meetings between attendees.
          </p>
          <a
            href={`${base}?kind=meetings`}
            className="mt-4 inline-flex rounded-full bg-indigo-600 px-4 py-2 text-sm font-medium text-white"
          >
            Download meetings CSV
          </a>
        </Card>
      </div>
    </div>
  );
}
