import { prisma } from "@/lib/db/prisma";
import { requireEvent } from "@/lib/authz/require";
import { safe } from "@/lib/authz/safe";
import { hasPermission } from "@/lib/authz/permissions";
import { loadBadgeList } from "@/modules/badges/service";
import { BadgesPanel } from "./badges-panel";

export default async function BadgesPage({
  params,
}: PageProps<"/app/[orgSlug]/events/[eventId]/badges">) {
  const { orgSlug, eventId } = await params;
  const ctx = await safe(() => requireEvent(orgSlug, eventId, "attendees.read"));
  const canPrint = hasPermission(ctx.grants, "checkin.perform");

  const rows = await loadBadgeList(ctx.organisation.id, eventId);

  return (
    <BadgesPanel
      orgSlug={orgSlug}
      eventId={eventId}
      rows={rows}
      canPrint={canPrint}
    />
  );
}
