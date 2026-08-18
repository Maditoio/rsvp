import { requireEvent } from "@/lib/authz/require";
import { safe } from "@/lib/authz/safe";
import { EventSubnav } from "@/components/event-subnav";
import { Card } from "@/components/ui/card";

export default async function ReportsPage({
  params,
}: PageProps<"/app/[orgSlug]/events/[eventId]/reports">) {
  const { orgSlug, eventId } = await params;
  const ctx = await safe(() => requireEvent(orgSlug, eventId, "reports.export"));
  const base = `/app/${orgSlug}/events/${eventId}/reports/download`;

  return (
    <div>
      <EventSubnav
        orgSlug={orgSlug}
        eventId={eventId}
        current="Reports"
        grants={ctx.grants}
      />
      <h1 className="font-display text-3xl text-gray-800">Reports</h1>
      <p className="mt-1 mb-6 text-sm text-gray-600">
        CSV exports are permission-gated and written to the audit log.
      </p>
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <h2 className="font-medium text-gray-800">Invitees</h2>
          <p className="mt-1 text-sm text-gray-600">
            Contacts for this event with their latest invitation status.
          </p>
          <a
            href={`${base}?kind=invitees`}
            className="mt-4 inline-flex rounded-sm bg-ink-600 px-4 py-2 text-sm font-medium text-white"
          >
            Download invitees CSV
          </a>
        </Card>
        <Card>
          <h2 className="font-medium text-gray-800">Attendees</h2>
          <p className="mt-1 text-sm text-gray-600">
            Registered attendees. Invitation accepted does not appear here until
            they register.
          </p>
          <a
            href={`${base}?kind=attendees`}
            className="mt-4 inline-flex rounded-sm bg-ink-600 px-4 py-2 text-sm font-medium text-white"
          >
            Download attendees CSV
          </a>
        </Card>
      </div>
    </div>
  );
}
