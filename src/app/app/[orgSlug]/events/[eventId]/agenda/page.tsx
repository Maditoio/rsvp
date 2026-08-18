import { prisma } from "@/lib/db/prisma";
import { requireEvent } from "@/lib/authz/require";
import { safe } from "@/lib/authz/safe";
import { hasPermission } from "@/lib/authz/permissions";
import { AgendaPanel } from "./agenda-panel";

export default async function AgendaPage({
  params,
}: PageProps<"/app/[orgSlug]/events/[eventId]/agenda">) {
  const { orgSlug, eventId } = await params;
  const ctx = await safe(() => requireEvent(orgSlug, eventId, "event.read"));
  const sessions = await prisma.session.findMany({
    where: { eventId, organisationId: ctx.organisation.id },
    include: { _count: { select: { registrations: true } } },
    orderBy: [{ startsAt: "asc" }, { title: "asc" }],
  });

  return (
    <div>
      <AgendaPanel
        orgSlug={orgSlug}
        eventId={eventId}
        canManage={hasPermission(ctx.grants, "event.update")}
        sessions={sessions.map((row) => ({
          id: row.id,
          title: row.title,
          description: row.description,
          location: row.location,
          startsAt: row.startsAt?.toLocaleString("en-GB") ?? "",
          endsAt: row.endsAt?.toLocaleString("en-GB") ?? "",
          startsAtValue: row.startsAt?.toISOString() ?? "",
          endsAtValue: row.endsAt?.toISOString() ?? "",
          registrations: row._count.registrations,
        }))}
      />
    </div>
  );
}
