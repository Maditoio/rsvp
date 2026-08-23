import { Suspense } from "react";
import { prisma } from "@/lib/db/prisma";
import { requireEvent } from "@/lib/authz/require";
import { safe } from "@/lib/authz/safe";
import { hasPermission } from "@/lib/authz/permissions";
import { AttendeesTable } from "./attendees-table";

export default async function AttendeesPage({
  params,
}: PageProps<"/app/[orgSlug]/events/[eventId]/attendees">) {
  const { orgSlug, eventId } = await params;
  const ctx = await safe(() => requireEvent(orgSlug, eventId, "attendees.read"));
  const canWrite = hasPermission(ctx.grants, "registrations.write");
  const attendees = await prisma.attendee.findMany({
    where: { eventId, organisationId: ctx.organisation.id },
    orderBy: { lastName: "asc" },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      company: true,
      jobTitle: true,
      country: true,
      status: true,
      category: { select: { name: true } },
    },
  });

  return (
    <div>
      <h1 className="font-display text-3xl text-slate-900">Attendees</h1>
      <p className="mt-1 mb-6 text-[0.8125rem] text-slate-500">
        Registered delegates for this event. An accepted invitation does not
        create an attendee record on its own.
      </p>
      <Suspense fallback={<div className="h-40 rounded-xl bg-white shadow-sm" />}>
        <AttendeesTable
          orgSlug={orgSlug}
          eventId={eventId}
          canWrite={canWrite}
          attendees={attendees.map((attendee) => ({
            id: attendee.id,
            firstName: attendee.firstName,
            lastName: attendee.lastName,
            email: attendee.email,
            company: attendee.company,
            jobTitle: attendee.jobTitle,
            country: attendee.country,
            status: attendee.status,
            categoryName: attendee.category?.name ?? null,
          }))}
        />
      </Suspense>
    </div>
  );
}
