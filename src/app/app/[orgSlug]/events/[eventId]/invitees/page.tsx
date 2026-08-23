import { Suspense } from "react";
import { prisma } from "@/lib/db/prisma";
import { requireEvent } from "@/lib/authz/require";
import { safe } from "@/lib/authz/safe";
import { hasPermission } from "@/lib/authz/permissions";
import { InviteesPanel } from "./invitees-panel";

export default async function InviteesPage({
  params,
}: PageProps<"/app/[orgSlug]/events/[eventId]/invitees">) {
  const { orgSlug, eventId } = await params;
  const ctx = await safe(() => requireEvent(orgSlug, eventId, "invitees.read"));
  const [contacts, categories] = await Promise.all([
    prisma.contact.findMany({
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
          select: { status: true, category: { select: { id: true, name: true } } },
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

  return (
    <Suspense fallback={<div className="h-40 rounded-xl bg-white shadow-sm" />}>
      <InviteesPanel
        orgSlug={orgSlug}
        eventId={eventId}
        canWrite={hasPermission(ctx.grants, "invitees.write")}
        canInvite={hasPermission(ctx.grants, "invitations.write")}
        categories={categories}
        contacts={contacts.map((contact) => ({
          id: contact.id,
          firstName: contact.firstName,
          lastName: contact.lastName,
          email: contact.email,
          company: contact.company,
          invitationStatus: contact.invitations[0]?.status ?? null,
          categoryId: contact.invitations[0]?.category?.id ?? null,
          categoryName: contact.invitations[0]?.category?.name ?? null,
        }))}
      />
    </Suspense>
  );
}
