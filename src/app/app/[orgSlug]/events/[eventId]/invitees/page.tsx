import Link from "next/link";
import { prisma } from "@/lib/db/prisma";
import { requireEvent } from "@/lib/authz/require";
import { safe } from "@/lib/authz/safe";
import { hasPermission } from "@/lib/authz/permissions";
import { EventSubnav } from "@/components/event-subnav";
import { Card } from "@/components/ui/card";
import { Table, Td, Th } from "@/components/ui/table";
import { StatusBadge } from "@/components/status-badge";
import { displayName } from "@/lib/utils";

export default async function InviteesPage({
  params,
}: PageProps<"/app/[orgSlug]/events/[eventId]/invitees">) {
  const { orgSlug, eventId } = await params;
  const ctx = await safe(() => requireEvent(orgSlug, eventId, "invitees.read"));
  const contacts = await prisma.contact.findMany({
    where: { eventId, organisationId: ctx.organisation.id },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      company: true,
      invitations: {
        orderBy: { createdAt: "desc" as const },
        take: 1,
        select: { status: true },
      },
    },
    orderBy: { lastName: "asc" },
  });
  const canImport = hasPermission(ctx.grants, "invitees.write");

  return (
    <div>
      <EventSubnav
        orgSlug={orgSlug}
        eventId={eventId}
        current="Invitees"
        grants={ctx.grants}
      />
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl text-gray-800">Invitees</h1>
          <p className="mt-1 text-sm text-gray-600">
            Contacts for this event. An invitee is not yet registered.
          </p>
        </div>
        {canImport ? (
          <Link
            href={`/app/${orgSlug}/events/${eventId}/invitees/import`}
            className="rounded-sm bg-ink-600 px-4 py-2 text-sm font-medium text-white"
          >
            Import CSV / Excel
          </Link>
        ) : null}
      </div>
      {contacts.length === 0 ? (
        <Card>
          <p className="text-gray-600">No invitees yet.</p>
          {canImport ? (
            <Link
              href={`/app/${orgSlug}/events/${eventId}/invitees/import`}
              className="mt-3 inline-block text-sm text-ink-600"
            >
              Import a contact list
            </Link>
          ) : null}
        </Card>
      ) : (
        <Table>
          <thead>
            <tr className="border-b border-gray-100">
              <Th>Name</Th>
              <Th>Email</Th>
              <Th>Company</Th>
              <Th>Invitation</Th>
            </tr>
          </thead>
          <tbody>
            {contacts.map((contact) => (
              <tr key={contact.id} className="border-b border-gray-50">
                <Td>{displayName(contact)}</Td>
                <Td>{contact.email}</Td>
                <Td>{contact.company ?? "—"}</Td>
                <Td>
                  {contact.invitations[0] ? (
                    <StatusBadge status={contact.invitations[0].status} />
                  ) : (
                    <span className="text-gray-400">Not invited</span>
                  )}
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </div>
  );
}
