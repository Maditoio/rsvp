import { requireEvent } from "@/lib/authz/require";
import { safe } from "@/lib/authz/safe";
import { EventSubnav } from "@/components/event-subnav";
import { DecisionCard } from "@/components/ui/card";
import { CheckInScanner } from "@/components/checkin-scanner";

export default async function CheckInPage({
  params,
}: PageProps<"/app/[orgSlug]/events/[eventId]/check-in">) {
  const { orgSlug, eventId } = await params;
  const ctx = await safe(() => requireEvent(orgSlug, eventId, "checkin.perform"));

  return (
    <div>
      <EventSubnav
        orgSlug={orgSlug}
        eventId={eventId}
        current="Check-in"
        grants={ctx.grants}
      />
      <DecisionCard className="mb-6">
        <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.06em] text-bronze-200">
          Check-in
        </p>
        <h1 className="mt-2 font-display text-4xl">Scan attendance tokens</h1>
        <p className="mt-2 text-ink-100">
          Paste or scan the opaque QR. Staff see only name, company, category
          and check-in status — never email, phone or notes.
        </p>
      </DecisionCard>
      <CheckInScanner orgSlug={orgSlug} eventId={eventId} />
    </div>
  );
}
