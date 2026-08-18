import Link from "next/link";
import { prisma } from "@/lib/db/prisma";
import { requireOrg } from "@/lib/authz/require";
import { safe } from "@/lib/authz/safe";
import { hasPermission } from "@/lib/authz/permissions";
import { Card } from "@/components/ui/card";

export default async function OrgHomePage({
  params,
}: PageProps<"/app/[orgSlug]">) {
  const { orgSlug } = await params;
  const ctx = await safe(() => requireOrg(orgSlug));
  const canCreate = hasPermission(ctx.grants, "event.create");
  const events = await prisma.event.findMany({
    where: { organisationId: ctx.organisation.id },
    orderBy: { createdAt: "desc" },
    take: 8,
  });

  return (
    <div>
      <h1 className="font-display text-4xl text-gray-800">
        {ctx.organisation.name}
      </h1>
      <p className="mt-2 text-gray-600">
        Manage multiple summits from one tenant. Every record belongs to this
        organisation.
      </p>
      <div className="mt-8 flex gap-3">
        {canCreate ? (
          <Link
            href={`/app/${orgSlug}/events/new`}
            className="rounded-sm bg-ink-600 px-4 py-2 text-sm font-medium text-white"
          >
            New event
          </Link>
        ) : null}
        <Link
          href={`/app/${orgSlug}/events`}
          className="rounded-sm bg-white border border-gray-300 px-4 py-2 text-sm font-medium text-gray-800"
        >
          All events
        </Link>
      </div>
      <div className="mt-8 grid gap-4 md:grid-cols-2">
        {events.length === 0 ? (
          <Card>
            <p className="text-gray-600">No events yet. Create the first summit.</p>
          </Card>
        ) : (
          events.map((event) => (
            <Link key={event.id} href={`/app/${orgSlug}/events/${event.id}`}>
              <Card className="h-full hover:bg-gray-50">
                <p className="text-lg font-medium">{event.name}</p>
                <p className="mt-1 text-sm text-gray-500">
                  {event.venue || "Venue TBC"} · {event.timezone}
                </p>
              </Card>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
