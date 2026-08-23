import Link from "next/link";
import { prisma } from "@/lib/db/prisma";
import { requireEvent } from "@/lib/authz/require";
import { safe } from "@/lib/authz/safe";
import { hasPermission } from "@/lib/authz/permissions";
import { eventCounts } from "@/modules/events/stats";
import { getEventChecklist } from "@/modules/events/checklist";
import { getAppUrl } from "@/lib/utils";
import { urlQrDataUrl } from "@/lib/qr";
import { DecisionCard } from "@/components/ui/card";
import { EventAnalytics } from "@/components/events/event-analytics";
import { EventChecklist } from "@/components/events/event-checklist";
import { ApplyQrBadge } from "./apply-url-card";

export default async function EventDashboardPage({
  params,
  searchParams,
}: PageProps<"/app/[orgSlug]/events/[eventId]">) {
  const { orgSlug, eventId } = await params;
  const query = await searchParams;
  const setupMode = query?.setup === "1";
  const ctx = await safe(() => requireEvent(orgSlug, eventId, "event.read"));

  const canUpdate = hasPermission(ctx.grants, "event.update");
  const [event, counts, checklist] = await Promise.all([
    prisma.event.findFirst({
      where: { id: eventId, organisationId: ctx.organisation.id },
      select: {
        id: true,
        name: true,
        slug: true,
        venue: true,
        timezone: true,
        settings: { select: { allowPublicApplication: true } },
      },
    }),
    eventCounts(ctx.organisation.id, eventId),
    canUpdate
      ? getEventChecklist(ctx.organisation.id, orgSlug, eventId)
      : null,
  ]);

  if (!event) return null;

  const applyUrl = event.settings?.allowPublicApplication
    ? `${getAppUrl()}/a/${orgSlug}/${event.slug}`
    : null;
  const applyQr = applyUrl ? await urlQrDataUrl(applyUrl) : null;

  return (
    <div>
      <DecisionCard>
        <div className="flex items-start justify-between gap-6">
          <div>
            <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.06em] text-indigo-200">
              Event
            </p>
            <h1 className="mt-2 font-display text-4xl">{event.name}</h1>
            <p className="mt-2 text-slate-100">
              {event.venue || "Venue TBC"} · {event.timezone}
            </p>
            {canUpdate ? (
              <div className="mt-4 flex flex-wrap gap-2">
                <Link
                  href={`/app/${orgSlug}/events/${eventId}/edit`}
                  className="inline-flex rounded-full bg-white/10 px-4 py-1.5 text-sm font-medium text-white hover:bg-white/20"
                >
                  Edit event
                </Link>
                <Link
                  href={`/app/${orgSlug}/events/${eventId}/settings`}
                  className="inline-flex rounded-full bg-white/10 px-4 py-1.5 text-sm font-medium text-white hover:bg-white/20"
                >
                  Event settings
                </Link>
              </div>
            ) : null}
          </div>
          {applyQr ? (
            <ApplyQrBadge dataUrl={applyQr} eventName={event.name} />
          ) : null}
        </div>
      </DecisionCard>

      <EventAnalytics counts={counts} />

      {checklist ? (
        <EventChecklist checklist={checklist} defaultOpen={Boolean(setupMode)} />
      ) : null}
    </div>
  );
}
