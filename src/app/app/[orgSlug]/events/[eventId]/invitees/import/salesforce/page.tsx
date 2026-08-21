import { prisma } from "@/lib/db/prisma";
import { requireEvent } from "@/lib/authz/require";
import { safe } from "@/lib/authz/safe";
import { SalesforceImportForm } from "./salesforce-import-form";

export default async function SalesforceInviteesImportPage({
  params,
}: PageProps<"/app/[orgSlug]/events/[eventId]/invitees/import/salesforce">) {
  const { orgSlug, eventId } = await params;
  const ctx = await safe(() => requireEvent(orgSlug, eventId, "invitees.write"));

  const [connection, categories] = await Promise.all([
    prisma.salesforceConnection.findUnique({
      where: { organisationId: ctx.organisation.id },
      select: { id: true, salesforceOrgId: true },
    }),
    prisma.invitationCategory.findMany({
      where: { eventId, organisationId: ctx.organisation.id },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  return (
    <SalesforceImportForm
      orgSlug={orgSlug}
      eventId={eventId}
      connected={Boolean(connection)}
      salesforceOrgId={connection?.salesforceOrgId ?? null}
      categories={categories}
    />
  );
}
