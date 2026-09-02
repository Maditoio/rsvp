import Link from "next/link";
import { Suspense } from "react";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { safe } from "@/lib/authz/safe";
import { listPlatformEvents } from "@/modules/platform/governance";
import { PlatformSearchBar } from "../platform-search-bar";
import {
  PlatformStatusTag,
  formatPlatformDate,
} from "../platform-ui";

export const dynamic = "force-dynamic";

export default async function PlatformEventsPage({
  searchParams,
}: PageProps<"/platform/events">) {
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q : "";
  const status =
    params.status === "active" || params.status === "suspended"
      ? params.status
      : "all";

  const events = await safe(() =>
    listPlatformEvents({ q, status, take: 150 }),
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Events"
        description="Search events across all companies and open them in organiser context."
        className="max-w-3xl"
      />

      <Card>
        <Suspense fallback={null}>
          <PlatformSearchBar placeholder="Search event, company name, or slug…" />
        </Suspense>
      </Card>

      <Card className="overflow-hidden p-0">
        {events.length === 0 ? (
          <p className="p-6 text-sm text-slate-600">No events match your search.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100 text-sm">
              <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-[0.04em] text-slate-500">
                <tr>
                  <th className="px-4 py-3">Event</th>
                  <th className="px-4 py-3">Company</th>
                  <th className="px-4 py-3">Dates</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {events.map((event) => {
                  const orgSuspended = Boolean(event.organisation.suspendedAt);
                  const eventSuspended = Boolean(event.suspendedAt);
                  return (
                    <tr key={event.id} className="hover:bg-slate-50/80">
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-900">{event.name}</p>
                        <p className="text-slate-500">{event.slug}</p>
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/platform/organisations/${event.organisation.id}`}
                          className="font-medium text-indigo-600 hover:text-indigo-700"
                        >
                          {event.organisation.name}
                        </Link>
                        <p className="text-slate-500">{event.organisation.slug}</p>
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {formatPlatformDate(event.startsAt)}
                        {event.endsAt ? ` – ${formatPlatformDate(event.endsAt)}` : ""}
                      </td>
                      <td className="px-4 py-3">
                        {orgSuspended ? (
                          <PlatformStatusTag suspended label="Company suspended" />
                        ) : (
                          <PlatformStatusTag suspended={eventSuspended} />
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/app/${event.organisation.slug}/events/${event.id}`}
                          className="inline-flex h-9 items-center rounded-full border border-slate-200 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                        >
                          Open
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
