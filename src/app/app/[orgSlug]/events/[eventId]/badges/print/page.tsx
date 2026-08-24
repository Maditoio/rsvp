import { notFound } from "next/navigation";
import { requireEvent } from "@/lib/authz/require";
import { safe } from "@/lib/authz/safe";
import { loadBadgePrintPayload } from "@/modules/badges/service";
import { markBadgesPrintedBulk } from "@/modules/badges/actions";
import { isBadgePrintPayload } from "@/modules/badges/type-guards";
import { BadgePrintView } from "@/components/badges/badge-print-view";

export default async function BadgePrintPage({
  params,
  searchParams,
}: PageProps<"/app/[orgSlug]/events/[eventId]/badges/print">) {
  const { orgSlug, eventId } = await params;
  const sp = await searchParams;
  const ctx = await safe(() => requireEvent(orgSlug, eventId, "checkin.perform"));

  const idsParam = typeof sp.ids === "string" ? sp.ids : "";
  const attendeeIds = idsParam
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean)
    .slice(0, 200);

  if (attendeeIds.length === 0) {
    notFound();
  }

  const payloads = (
    await Promise.all(
      attendeeIds.map((id) =>
        loadBadgePrintPayload(ctx.organisation.id, eventId, id),
      ),
    )
  ).filter(isBadgePrintPayload);

  if (payloads.length === 0) {
    notFound();
  }

  const autoPrint = sp.autoprint === "1";
  if (autoPrint) {
    await markBadgesPrintedBulk(
      orgSlug,
      eventId,
      payloads.map((p) => p.attendeeId),
    );
  }

  return <BadgePrintView badges={payloads} autoPrint={autoPrint} />;
}
