import Link from "next/link";
import { prisma } from "@/lib/db/prisma";
import { requireOrg } from "@/lib/authz/require";
import { safe } from "@/lib/authz/safe";
import { hasPermission } from "@/lib/authz/permissions";
import { ButtonPlusIcon } from "@/components/ui/button";
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
    <div className="flex-1 p-6 md:p-10">
      <h1 className="font-display text-4xl text-slate-900">
        {ctx.organisation.name}
      </h1>
      <p className="mt-2 text-slate-600">
        Manage multiple summits from one tenant. Every record belongs to this
        organisation.
      </p>
      <div className="mt-8 flex flex-wrap justify-end gap-3">
        {canCreate ? (
          <Link
            href={`/app/${orgSlug}/events/new`}
            className="inline-flex h-10 items-center gap-1.5 rounded-full bg-indigo-600 px-5 text-sm font-semibold text-white shadow-accent hover:bg-indigo-700"
          >
            <ButtonPlusIcon />
            New event
          </Link>
        ) : null}
        <Link
          href={`/app/${orgSlug}/events`}
          className="inline-flex h-10 items-center rounded-full border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          All events
        </Link>
      </div>
      <div className="mt-8 grid gap-4 md:grid-cols-2">
        {events.length === 0 ? (
          <Card>
            <p className="text-slate-600">No events yet. Create the first summit.</p>
          </Card>
        ) : (
          events.map((event) => (
            <Link key={event.id} href={`/app/${orgSlug}/events/${event.id}`}>
              <Card className="h-full hover:bg-slate-50">
                <p className="text-lg font-medium">{event.name}</p>
                <p className="mt-1 text-sm text-slate-500">
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
