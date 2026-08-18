import { InvitationStatus } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { requireEvent } from "@/lib/authz/require";
import { safe } from "@/lib/authz/safe";
import { hasPermission } from "@/lib/authz/permissions";
import { EventSubnav } from "@/components/event-subnav";
import { InvitationsPanel } from "./invitations-panel";

const INACTIVE_STATUSES: InvitationStatus[] = [
  "CANCELLED",
  "EXPIRED",
  "DECLINED",
];

export default async function InvitationsPage({
  params,
}: PageProps<"/app/[orgSlug]/events/[eventId]/invitations">) {
  const { orgSlug, eventId } = await params;
  const ctx = await safe(() =>
    requireEvent(orgSlug, eventId, "invitations.read"),
  );

  const [invitations, contacts, categories] = await Promise.all([
    prisma.invitation.findMany({
      where: { eventId, organisationId: ctx.organisation.id },
      select: {
        id: true,
        status: true,
        contact: { select: { firstName: true, lastName: true, email: true } },
        category: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.contact.findMany({
      where: { eventId, organisationId: ctx.organisation.id },
      include: {
        invitations: {
          where: { status: { notIn: INACTIVE_STATUSES } },
          take: 1,
        },
      },
      orderBy: { lastName: "asc" },
    }),
    prisma.invitationCategory.findMany({
      where: { eventId, organisationId: ctx.organisation.id },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  const uninvited = contacts
    .filter((contact) => contact.invitations.length === 0)
    .map(({ id, firstName, lastName, email, company }) => ({
      id,
      firstName,
      lastName,
      email,
      company,
    }));

  return (
    <div>
      <EventSubnav
        orgSlug={orgSlug}
        eventId={eventId}
        current="Invitations"
        grants={ctx.grants}
      />
      <h1 className="mb-2 font-display text-3xl text-ink-800">Invitations</h1>
      <p className="mb-6 text-sm text-stone-700">
        Invitation status is independent of registration. Accepted is not
        registered.
      </p>
      <InvitationsPanel
        orgSlug={orgSlug}
        eventId={eventId}
        invitations={invitations}
        uninvited={uninvited}
        categories={categories}
        canWrite={hasPermission(ctx.grants, "invitations.write")}
      />
    </div>
  );
}
