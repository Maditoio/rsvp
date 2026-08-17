import { prisma } from "@/lib/db/prisma";
import { requireEvent } from "@/lib/authz/require";
import { safe } from "@/lib/authz/safe";
import { EventSubnav } from "@/components/event-subnav";
import { Card } from "@/components/ui/card";
import { Table, Td, Th } from "@/components/ui/table";
import { StatusBadge } from "@/components/status-badge";
import { displayName } from "@/lib/utils";
import { format } from "date-fns";

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
  const responses = await prisma.registrationResponse.findMany({
    where: { eventId, organisationId: ctx.organisation.id },
    include: {
      contact: { select: { firstName: true, lastName: true, email: true } },
      invitation: { select: { status: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <EventSubnav
        orgSlug={orgSlug}
        eventId={eventId}
        current="Registrations"
        grants={ctx.grants}
      />
      <h1 className="font-serif text-3xl text-slate-900">Registrations</h1>
      <p className="mt-1 mb-6 text-sm text-slate-600">
        Invitation accepted is not registered. A registration response is created
        only after the invitee completes the form.
      </p>
      {responses.length === 0 ? (
        <Card>
          <p className="text-slate-600">No registration responses yet.</p>
          <p className="mt-2 text-sm text-slate-500">
            People who have accepted an invitation still need to register before
            they appear here.
          </p>
        </Card>
      ) : (
        <Table>
          <thead>
            <tr className="border-b border-slate-100">
              <Th>Name</Th>
              <Th>Email</Th>
              <Th>Invitation</Th>
              <Th>Registration</Th>
              <Th>Submitted</Th>
            </tr>
          </thead>
          <tbody>
            {responses.map((row) => {
              const data = (row.data ?? {}) as RegistrationData;
              const name = row.contact
                ? displayName(row.contact)
                : displayName({
                    firstName: data.firstName,
                    lastName: data.lastName,
                  });
              const email = row.contact?.email ?? data.email ?? "—";
              return (
                <tr key={row.id} className="border-b border-slate-50">
                  <Td>{name}</Td>
                  <Td>{email}</Td>
                  <Td>
                    {row.invitation ? (
                      <StatusBadge status={row.invitation.status} />
                    ) : (
                      "—"
                    )}
                  </Td>
                  <Td>
                    <StatusBadge status={row.status} />
                  </Td>
                  <Td>{format(row.createdAt, "d MMM yyyy HH:mm")}</Td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      )}
    </div>
  );
}
