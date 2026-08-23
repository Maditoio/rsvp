import { Suspense } from "react";
import { InvitationStatus } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { requireEvent } from "@/lib/authz/require";
import { safe } from "@/lib/authz/safe";
import { hasPermission } from "@/lib/authz/permissions";
import { InvitationsPanel } from "./invitations-panel";
import { PageHeader } from "@/components/ui/page-header";

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
        category: { select: { id: true, name: true } },
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
      <PageHeader
        eyebrow="Communications"
        title="Invitations"
        description="Invitation status is independent of registration. Accepted is not registered."
        className="mb-6"
      />
      <Suspense fallback={<div className="h-40 rounded-xl bg-white shadow-sm" />}>
        <InvitationsPanel
          orgSlug={orgSlug}
          eventId={eventId}
          invitations={invitations}
          uninvited={uninvited}
          categories={categories}
          canWrite={hasPermission(ctx.grants, "invitations.write")}
        />
      </Suspense>
    </div>
  );
}
