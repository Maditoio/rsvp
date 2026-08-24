import { Suspense } from "react";
import { prisma } from "@/lib/db/prisma";
import { requireEvent } from "@/lib/authz/require";
import { safe } from "@/lib/authz/safe";
import { getAppUrl } from "@/lib/utils";
import { urlQrDataUrl } from "@/lib/qr";
import { parseOperationsConfig } from "@/modules/events/operations-config";
import { parseBadgeConfig } from "@/modules/badges/config";
import { EventSettingsForm } from "./event-settings-form";
import { EventOperationsSettingsForm } from "./event-settings-operations";
import { BadgeSettingsForm } from "./event-settings-badges";
import { EventSettingsTabs } from "./event-settings-tabs";
import { resolveEventSettingsTab } from "./event-settings-tab-types";

const SETTINGS_DEFAULTS = {
  invitationExpiryDays: 30,
  capacity: null as number | null,
  waitlistEnabled: false,
  allowPublicApplication: false,
  aiInsightsEnabled: false,
  automationsEnabled: true,
  meetingDurationMinutes: 15,
  eventStartTime: "09:00",
  eventEndTime: "18:00",
};

export default async function EventSettingsPage({
  params,
  searchParams,
}: PageProps<"/app/[orgSlug]/events/[eventId]/settings">) {
  const { orgSlug, eventId } = await params;
  const query = await searchParams;
  const tab = resolveEventSettingsTab(
    typeof query.tab === "string" ? query.tab : null,
  );
  const ctx = await safe(() => requireEvent(orgSlug, eventId, "event.update"));

  let settingsError = false;
  let eventRow: {
    name: string;
    slug: string;
    logoUrl: string | null;
    settings: Record<string, unknown> | null;
  } | null = null;
  let categories: { id: string; name: string }[] = [];
  let polls: { id: string; title: string }[] = [];

  try {
    [eventRow, categories, polls] = await Promise.all([
      prisma.event.findFirst({
        where: { id: eventId, organisationId: ctx.organisation.id },
        select: { name: true, slug: true, logoUrl: true, settings: true },
      }),
      prisma.invitationCategory.findMany({
        where: { eventId, organisationId: ctx.organisation.id },
        orderBy: { name: "asc" },
        select: { id: true, name: true },
      }),
      prisma.eventPoll.findMany({
        where: {
          eventId,
          organisationId: ctx.organisation.id,
          status: "PUBLISHED",
        },
        select: { id: true, title: true },
        orderBy: { title: "asc" },
      }),
    ]);
  } catch (e) {
    if (e instanceof Error && e.message.includes("does not exist")) {
      settingsError = true;
    } else {
      throw e;
    }
  }

  if (settingsError) {
    return (
      <div className="rounded-md border border-slate-200 bg-slate-50 p-6 text-sm text-slate-600">
        <p className="font-medium text-slate-700">
          Settings temporarily unavailable
        </p>
        <p className="mt-1">
          A database update is in progress. Settings will be available once the
          migration completes. Please try again in a moment.
        </p>
      </div>
    );
  }

  if (!eventRow) {
    return (
      <div className="rounded-xl bg-white p-6 text-sm text-slate-600 shadow-sm">
        <p className="font-medium text-slate-900">Event not found</p>
        <p className="mt-1">
          This event may have been removed or you no longer have access.
        </p>
      </div>
    );
  }

  const settings = { ...SETTINGS_DEFAULTS, ...eventRow.settings };
  const operationsConfig = parseOperationsConfig(
    (
      eventRow.settings as {
        operationsConfig?: import("@prisma/client").Prisma.JsonValue;
      } | null
    )?.operationsConfig,
  );
  const badgeConfig = parseBadgeConfig(
    (eventRow.settings as { badgeConfig?: unknown } | null)?.badgeConfig,
  );
  const applyUrl = `${getAppUrl()}/a/${orgSlug}/${eventRow.slug}`;
  const badgePreviewQrDataUrl = await urlQrDataUrl("https://preview/badge");
  const applyQr = settings.allowPublicApplication
    ? await urlQrDataUrl(applyUrl)
    : null;

  return (
    <div>
      <header className="mb-6">
        <p className="mb-2 text-[0.71875rem] font-semibold uppercase tracking-[0.04em] text-indigo-600">
          Event
        </p>
        <h1 className="mb-1 text-[1.875rem] font-semibold text-slate-900">
          Event settings
        </h1>
        <p className="mb-6 text-[0.9375rem] text-slate-500">
          Configure registration, operations, and badge printing for{" "}
          {eventRow.name}.
        </p>

        <Suspense
          fallback={<div className="mb-7 h-10 border-b border-slate-200" />}
        >
          <EventSettingsTabs
            orgSlug={orgSlug}
            eventId={eventId}
            active={tab}
          />
        </Suspense>
      </header>

      {tab === "general" ? (
        <EventSettingsForm
          orgSlug={orgSlug}
          eventId={eventId}
          applyUrl={applyUrl}
          applyQrDataUrl={applyQr}
          settings={settings}
        />
      ) : null}

      {tab === "operations" ? (
        <EventOperationsSettingsForm
          orgSlug={orgSlug}
          eventId={eventId}
          config={operationsConfig}
          categories={categories}
          polls={polls}
        />
      ) : null}

      {tab === "badges" ? (
        <BadgeSettingsForm
          orgSlug={orgSlug}
          eventId={eventId}
          eventName={eventRow.name}
          logoUrl={eventRow.logoUrl}
          previewQrDataUrl={badgePreviewQrDataUrl}
          config={badgeConfig}
        />
      ) : null}
    </div>
  );
}
