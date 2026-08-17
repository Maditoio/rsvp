import { prisma } from "@/lib/db/prisma";
import { requireEvent } from "@/lib/authz/require";
import { safe } from "@/lib/authz/safe";
import { EventSubnav } from "@/components/event-subnav";
import { Card } from "@/components/ui/card";
import { Table, Td, Th } from "@/components/ui/table";
import { StatusBadge } from "@/components/status-badge";
import { displayName } from "@/lib/utils";

export default async function AttendeesPage({
  params,
}: PageProps<"/app/[orgSlug]/events/[eventId]/attendees">) {
  const { orgSlug, eventId } = await params;
  const ctx = await safe(() => requireEvent(orgSlug, eventId, "attendees.read"));
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
      <EventSubnav
        orgSlug={orgSlug}
        eventId={eventId}
        current="Attendees"
        grants={ctx.grants}
      />
      <h1 className="font-serif text-3xl text-slate-900">Attendees</h1>
      <p className="mt-1 mb-6 text-sm text-slate-600">
        Registered delegates for this event. An accepted invitation does not
        create an attendee record on its own.
      </p>
      {attendees.length === 0 ? (
        <Card>No attendees yet.</Card>
      ) : (
        <Table>
          <thead>
            <tr className="border-b border-slate-100">
              <Th>Name</Th>
              <Th>Email</Th>
              <Th>Company</Th>
              <Th>Job title</Th>
              <Th>Country</Th>
              <Th>Category</Th>
              <Th>Status</Th>
            </tr>
          </thead>
          <tbody>
            {attendees.map((attendee) => (
              <tr key={attendee.id} className="border-b border-slate-50">
                <Td>{displayName(attendee)}</Td>
                <Td>{attendee.email}</Td>
                <Td>{attendee.company ?? "—"}</Td>
                <Td>{attendee.jobTitle ?? "—"}</Td>
                <Td>{attendee.country ?? "—"}</Td>
                <Td>{attendee.category?.name ?? "—"}</Td>
                <Td>
                  <StatusBadge status={attendee.status} />
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </div>
  );
}
