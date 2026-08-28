import { prisma } from "@/lib/db/prisma";
import { requireEvent } from "@/lib/authz/require";
import { safe } from "@/lib/authz/safe";
import { formatSessionSchedule } from "@/lib/session-schedule";
import { urlQrDataUrl } from "@/lib/qr";
import { getAppUrl } from "@/lib/utils";
import { loadEventWebsiteSettings } from "@/modules/event-sites/service";
import { EventWebsiteBuilder } from "./event-website-builder";

export default async function EventWebsitePage({
  params,
}: PageProps<"/app/[orgSlug]/events/[eventId]/website">) {
  const { orgSlug, eventId } = await params;
  const ctx = await safe(() => requireEvent(orgSlug, eventId, "event.update"));

  const [settings, organisation, sessions] = await Promise.all([
    loadEventWebsiteSettings(ctx.organisation.id, eventId),
    prisma.organisation.findUnique({
      where: { id: ctx.organisation.id },
      select: { name: true },
    }),
    prisma.session.findMany({
      where: { eventId, organisationId: ctx.organisation.id },
      orderBy: [{ startsAt: "asc" }, { title: "asc" }],
      select: {
        id: true,
        title: true,
        description: true,
        startsAt: true,
        endsAt: true,
        location: true,
      },
    }),
  ]);

  if (!settings || !organisation) {
    return (
      <div className="rounded-xl bg-white p-6 text-sm text-slate-600 shadow-sm">
        <p className="font-medium text-slate-900">Event not found</p>
      </div>
    );
  }

  const publicUrl = `${getAppUrl()}/e/${orgSlug}/${settings.event.slug}`;
  const applyUrl = settings.event.allowPublicApplication
    ? `${getAppUrl()}/a/${orgSlug}/${settings.event.slug}`
    : null;
  const publicQrDataUrl = settings.websitePublishedAt
    ? await urlQrDataUrl(publicUrl)
    : null;

  const sessionPreviews = sessions.map((s) => {
    const schedule = formatSessionSchedule(
      s.startsAt,
      s.endsAt,
      settings.event.timezone,
    );
    return {
      id: s.id,
      title: s.title,
      description: s.description,
      location: s.location,
      dateLabel: schedule.dateLabel,
      timeLabel: schedule.timeLabel,
    };
  });

  return (
    <EventWebsiteBuilder
      orgSlug={orgSlug}
      eventId={eventId}
      orgName={organisation.name}
      settings={settings}
      publicUrl={publicUrl}
      applyUrl={applyUrl}
      sessions={sessionPreviews}
      publicQrDataUrl={publicQrDataUrl}
    />
  );
}
