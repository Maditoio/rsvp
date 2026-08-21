import { prisma } from "@/lib/db/prisma";
import { requireEvent } from "@/lib/authz/require";
import { safe } from "@/lib/authz/safe";
import { HubSpotImportForm } from "./hubspot-import-form";

export default async function HubSpotInviteesImportPage({
  params,
}: PageProps<"/app/[orgSlug]/events/[eventId]/invitees/import/hubspot">) {
  const { orgSlug, eventId } = await params;
  const ctx = await safe(() => requireEvent(orgSlug, eventId, "invitees.write"));

  const [connection, categories] = await Promise.all([
    prisma.hubSpotConnection.findUnique({
      where: { organisationId: ctx.organisation.id },
      select: { id: true, portalId: true },
    }),
    prisma.invitationCategory.findMany({
      where: { eventId, organisationId: ctx.organisation.id },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  return (
    <HubSpotImportForm
      orgSlug={orgSlug}
      eventId={eventId}
      connected={Boolean(connection)}
      portalId={connection?.portalId ?? null}
      categories={categories}
    />
  );
}
