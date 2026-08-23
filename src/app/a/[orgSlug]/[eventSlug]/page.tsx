import { notFound } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { Card, DecisionCard } from "@/components/ui/card";
import { formatEventWindow, turnstileSiteKey } from "@/lib/utils";
import { PublicApplyForm } from "./apply-form";

export default async function PublicApplyPage({
  params,
}: PageProps<"/a/[orgSlug]/[eventSlug]">) {
  const { orgSlug, eventSlug } = await params;
  const event = await prisma.event.findFirst({
    where: { slug: eventSlug, organisation: { slug: orgSlug } },
    include: { settings: true, organisation: { select: { name: true } } },
  });
  if (!event?.settings?.allowPublicApplication) notFound();

  return (
    <div className="space-y-6">
      <DecisionCard>
        <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.06em] text-indigo-200">
          {event.organisation.name}
        </p>
        <h1 className="mt-2 font-display text-4xl">{event.name}</h1>
        <p className="mt-2 text-slate-100">
          {event.venue || "Venue TBC"} ·{" "}
          {formatEventWindow(event.startsAt, event.endsAt, event.timezone)}
        </p>
      </DecisionCard>
      <Card>
        <p className="text-sm text-slate-700">
          Apply to be considered. An approved application becomes an invitation.
          It does not register you for the event.
        </p>
        <div className="mt-6">
          <PublicApplyForm
            orgSlug={orgSlug}
            eventSlug={eventSlug}
            siteKey={turnstileSiteKey()}
          />
        </div>
      </Card>
    </div>
  );
}
