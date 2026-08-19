import { prisma } from "@/lib/db/prisma";
import { requireEvent } from "@/lib/authz/require";
import { safe } from "@/lib/authz/safe";
import { getAppUrl } from "@/lib/utils";
import { urlQrDataUrl } from "@/lib/qr";
import { EventSettingsForm } from "./event-settings-form";

const SETTINGS_DEFAULTS = {
  invitationExpiryDays: 30,
  capacity: null as number | null,
  waitlistEnabled: false,
  allowPublicApplication: false,
  aiInsightsEnabled: false,
  meetingDurationMinutes: 15,
  eventStartTime: "09:00",
  eventEndTime: "18:00",
};

export default async function EventSettingsPage({
  params,
}: PageProps<"/app/[orgSlug]/events/[eventId]/settings">) {
  const { orgSlug, eventId } = await params;
  const ctx = await safe(() => requireEvent(orgSlug, eventId, "event.update"));

  let event: { name: string; slug: string; settings: typeof SETTINGS_DEFAULTS | null } | null = null;
  let settingsError = false;

  try {
    event = await prisma.event.findFirst({
      where: { id: eventId, organisationId: ctx.organisation.id },
      select: {
        name: true,
        slug: true,
        settings: true,
      },
    });
  } catch (e) {
    if (e instanceof Error && e.message.includes("does not exist")) {
      settingsError = true;
      const basic = await prisma.event.findFirst({
        where: { id: eventId, organisationId: ctx.organisation.id },
        select: { name: true, slug: true },
      });
      if (basic) {
        event = { ...basic, settings: null };
      }
    } else {
      throw e;
    }
  }

  if (!event) return null;

  if (settingsError) {
    return (
      <div className="rounded-md border border-stone-200 bg-stone-50 p-6 text-sm text-stone-600">
        <p className="font-medium text-stone-700">Settings temporarily unavailable</p>
        <p className="mt-1">
          A database update is in progress. Settings will be available once the
          migration completes. Please try again in a moment.
        </p>
      </div>
    );
  }

  const settings = { ...SETTINGS_DEFAULTS, ...event.settings };
  const applyUrl = `${getAppUrl()}/a/${orgSlug}/${event.slug}`;
  const applyQr = settings.allowPublicApplication
    ? await urlQrDataUrl(applyUrl)
    : null;

  return (
    <div>
      <EventSettingsForm
        orgSlug={orgSlug}
        eventId={eventId}
        applyUrl={applyUrl}
        applyQrDataUrl={applyQr}
        settings={settings}
      />
    </div>
  );
}
