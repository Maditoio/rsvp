import Link from "next/link";
import { prisma } from "@/lib/db/prisma";
import { requireEvent } from "@/lib/authz/require";
import { safe } from "@/lib/authz/safe";
import { hasPermission } from "@/lib/authz/permissions";
import { eventCounts } from "@/modules/events/stats";
import { Card, DecisionCard } from "@/components/ui/card";
import { StaffManagement } from "./staff-management";

export default async function EventDashboardPage({
  params,
}: PageProps<"/app/[orgSlug]/events/[eventId]">) {
  const { orgSlug, eventId } = await params;
  const ctx = await safe(() => requireEvent(orgSlug, eventId, "event.read"));

  const canUpdate = hasPermission(ctx.grants, "event.update");
  const [event, counts] = await Promise.all([
    prisma.event.findFirst({
      where: { id: eventId, organisationId: ctx.organisation.id },
      select: {
        id: true,
        name: true,
        venue: true,
        timezone: true,
      },
    }),
    eventCounts(ctx.organisation.id, eventId),
  ]);

  if (!event) return null;

  const staff = canUpdate
    ? await prisma.eventUser.findMany({
        where: {
          organisationId: ctx.organisation.id,
          eventId,
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
        orderBy: [{ role: "asc" }, { createdAt: "asc" }],
      })
    : [];
  const orgRoles = new Map(
    canUpdate
      ? (
          await prisma.organisationUser.findMany({
            where: { organisationId: ctx.organisation.id },
            select: {
              userId: true,
              role: true,
            },
          })
        ).map((membership) => [membership.userId, membership.role])
      : [],
  );

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
      <DecisionCard>
        <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.06em] text-bronze-200">
          Event
        </p>
        <h1 className="mt-2 font-display text-4xl">{event.name}</h1>
        <p className="mt-2 text-ink-100">
          {event.venue || "Venue TBC"} · {event.timezone}
        </p>
        {canUpdate ? (
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href={`/app/${orgSlug}/events/${eventId}/edit`}
              className="inline-flex rounded-sm bg-white/10 px-4 py-1.5 text-sm text-white hover:bg-white/20"
            >
              Edit event
            </Link>
            <Link
              href={`/app/${orgSlug}/events/${eventId}/settings`}
              className="inline-flex rounded-sm bg-white/10 px-4 py-1.5 text-sm text-white hover:bg-white/20"
            >
              Event settings
            </Link>
          </div>
        ) : null}
      </DecisionCard>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {tiles.map(([label, value]) => (
          <Card key={label}>
            <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.06em] text-stone-500">
              {label}
            </p>
            <p className="mt-2 text-3xl font-medium text-ink-800">{value}</p>
          </Card>
        ))}
      </div>

      {canUpdate ? (
        <div className="mt-6">
          <StaffManagement
            orgSlug={orgSlug}
            eventId={eventId}
            canManage={canUpdate}
            staff={staff.map((assignment) => ({
              userId: assignment.user.id,
              email: assignment.user.email,
              firstName: assignment.user.firstName,
              lastName: assignment.user.lastName,
              role: assignment.role,
              orgRole: orgRoles.get(assignment.user.id) ?? null,
              assignedAt: assignment.createdAt.toLocaleDateString("en-GB"),
              isCurrentUser: assignment.user.id === ctx.user.id,
            }))}
          />
        </div>
      ) : null}
    </div>
  );
}
