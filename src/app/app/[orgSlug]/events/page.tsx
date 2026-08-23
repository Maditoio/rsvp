import Link from "next/link";
import { prisma } from "@/lib/db/prisma";
import { requireOrg } from "@/lib/authz/require";
import { safe } from "@/lib/authz/safe";
import { hasPermission } from "@/lib/authz/permissions";
import { ButtonPlusIcon } from "@/components/ui/button";
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
    <div className="flex-1 p-6 md:p-10">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl text-slate-900">Events</h1>
        {canCreate ? (
          <Link
            href={`/app/${orgSlug}/events/new`}
            className="inline-flex h-10 items-center gap-1.5 rounded-full bg-indigo-600 px-5 text-sm font-semibold text-white shadow-accent hover:bg-indigo-700"
          >
            <ButtonPlusIcon />
            New event
          </Link>
        ) : null}
      </div>
      <div className="mt-6 flex flex-col gap-6">
        {events.map((event) => (
          <Link
            key={event.id}
            href={`/app/${orgSlug}/events/${event.id}`}
            className="block"
          >
            <Card className="transition-colors hover:bg-slate-50">
              <p className="font-medium text-slate-900">{event.name}</p>
              <p className="text-sm text-slate-500">{event.slug}</p>
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
