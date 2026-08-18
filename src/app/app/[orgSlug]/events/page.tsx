import Link from "next/link";
import { prisma } from "@/lib/db/prisma";
import { requireOrg } from "@/lib/authz/require";
import { safe } from "@/lib/authz/safe";
import { hasPermission } from "@/lib/authz/permissions";
import { Card } from "@/components/ui/card";

export default async function EventsPage({
  params,
}: PageProps<"/app/[orgSlug]/events">) {
  const { orgSlug } = await params;
  const ctx = await safe(() => requireOrg(orgSlug, "event.read"));
  const canCreate = hasPermission(ctx.grants, "event.create");
  const events = await prisma.event.findMany({
    where: { organisationId: ctx.organisation.id },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl">Events</h1>
        {canCreate ? (
          <Link
            href={`/app/${orgSlug}/events/new`}
            className="rounded-sm bg-ink-600 px-4 py-2 text-sm font-medium text-white"
          >
            New event
          </Link>
        ) : null}
      </div>
      <div className="mt-6 space-y-3">
        {events.map((event) => (
          <Link key={event.id} href={`/app/${orgSlug}/events/${event.id}`}>
            <Card className="hover:bg-gray-50">
              <p className="font-medium">{event.name}</p>
              <p className="text-sm text-gray-500">{event.slug}</p>
            </Card>
          </Link>
        ))}
        {events.length === 0 ? (
          <Card>No events yet.</Card>
        ) : null}
      </div>
    </div>
  );
}
