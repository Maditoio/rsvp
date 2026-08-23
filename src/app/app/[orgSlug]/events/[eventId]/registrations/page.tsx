import { Suspense } from "react";
import { format } from "date-fns";
import { prisma } from "@/lib/db/prisma";
import { requireEvent } from "@/lib/authz/require";
import { safe } from "@/lib/authz/safe";
import { hasPermission } from "@/lib/authz/permissions";
import { displayName } from "@/lib/utils";
import { RegistrationsTable } from "./registrations-table";
import { PageHeader } from "@/components/ui/page-header";

type RegistrationData = {
  firstName?: string;
  lastName?: string;
  email?: string;
};

export default async function RegistrationsPage({
  params,
}: PageProps<"/app/[orgSlug]/events/[eventId]/registrations">) {
  const { orgSlug, eventId } = await params;
  const ctx = await safe(() =>
    requireEvent(orgSlug, eventId, "registrations.read"),
  );
  const canWrite = hasPermission(ctx.grants, "registrations.write");
  const responses = await prisma.registrationResponse.findMany({
    where: { eventId, organisationId: ctx.organisation.id },
    include: {
      contact: { select: { firstName: true, lastName: true, email: true } },
      invitation: { select: { status: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const rows = responses.map((row) => {
    const data = (row.data ?? {}) as RegistrationData;
    const name = row.contact
      ? displayName(row.contact)
      : displayName({
          firstName: data.firstName,
          lastName: data.lastName,
        });
    const email = row.contact?.email ?? data.email ?? "—";
    return {
      id: row.id,
      name,
      email,
      invitationStatus: row.invitation?.status ?? null,
      status: row.status,
      submittedAt: format(row.createdAt, "d MMM yyyy HH:mm"),
    };
  });

  return (
    <div>
      <PageHeader
        title="Registrations"
        description="Invitation accepted is not registered. A registration response is created only after the invitee completes the form."
        className="mb-6"
      />
      {rows.length === 0 ? (
        <div className="rounded-xl bg-white shadow-sm px-5 py-8">
          <p className="text-slate-700">No registration responses yet.</p>
          <p className="mt-2 text-sm text-slate-500">
            People who have accepted an invitation still need to register before
            they appear here.
          </p>
        </div>
      ) : (
        <Suspense fallback={<div className="h-40 rounded-xl bg-white shadow-sm" />}>
          <RegistrationsTable
            orgSlug={orgSlug}
            eventId={eventId}
            canWrite={canWrite}
            rows={rows}
          />
        </Suspense>
      )}
    </div>
  );
}
