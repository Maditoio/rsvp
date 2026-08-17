import Link from "next/link";
import { prisma } from "@/lib/db/prisma";
import { requireEvent } from "@/lib/authz/require";
import { safe } from "@/lib/authz/safe";
import { hasPermission } from "@/lib/authz/permissions";
import { eventCounts } from "@/modules/events/stats";
import { EventSubnav } from "@/components/event-subnav";
import { Card, DecisionCard } from "@/components/ui/card";

export default async function EventDashboardPage({
  params,
}: PageProps<"/app/[orgSlug]/events/[eventId]">) {
  const { orgSlug, eventId } = await params;
  const ctx = await safe(() => requireEvent(orgSlug, eventId, "event.read"));
  const event = await prisma.event.findFirst({
    where: { id: eventId, organisationId: ctx.organisation.id },
  });
  if (!event) return null;
  const counts = await eventCounts(ctx.organisation.id, eventId);
  const canUpdate = hasPermission(ctx.grants, "event.update");

  const tiles = [
    ["Invited", counts.invited],
    ["Accepted", counts.accepted],
    ["Registered", counts.registered],
    ["Confirmed", counts.confirmed],
    ["Declined", counts.declined],
    ["Pending", counts.pending],
    ["Checked in", counts.checkedIn],
  ] as const;

  return (
    <div>
      <EventSubnav
        orgSlug={orgSlug}
        eventId={eventId}
        current="Dashboard"
        grants={ctx.grants}
      />
      <DecisionCard>
        <p className="text-xs uppercase tracking-[0.18em] text-accent-200">
          Event
        </p>
        <h1 className="mt-2 font-serif text-4xl">{event.name}</h1>
        <p className="mt-2 text-primary-100">
          {event.venue || "Venue TBC"} · {event.timezone}
        </p>
        {canUpdate ? (
          <Link
            href={`/app/${orgSlug}/events/${eventId}/edit`}
            className="mt-4 inline-flex rounded-full bg-white/10 px-4 py-1.5 text-sm text-white hover:bg-white/20"
          >
            Edit event
          </Link>
        ) : null}
      </DecisionCard>
      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {tiles.map(([label, value]) => (
          <Card key={label}>
            <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
            <p className="mt-2 text-3xl font-medium text-slate-900">{value}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}
