import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/authz/require";
import { safe } from "@/lib/authz/safe";
import { AuthzError } from "@/lib/db/tenant";
import { getAppUrl } from "@/lib/utils";
import { getGoogleAuthUrl } from "@/modules/calendar/google";
import { getMicrosoftAuthUrl, microsoftConfigured } from "@/modules/calendar/microsoft";
import { CalendarPanel } from "./calendar-panel";

export default async function CalendarPage({
  params,
  searchParams,
}: PageProps<"/me/events/[eventId]/calendar">) {
  const { eventId } = await params;
  const query = await searchParams;
  const oauthError =
    typeof query.error === "string" ? query.error : null;
  const user = await safe(() => requireUser());

  const attendee = await prisma.attendee.findFirst({
    where: { eventId, userId: user.id },
    include: { event: { select: { name: true } } },
  });
  if (!attendee) {
    await safe(async () => {
      throw new AuthzError("You are not registered for this event", 403);
    });
    return null;
  }

  const connections = await prisma.calendarConnection.findMany({
    where: { userId: user.id, provider: { in: ["google", "microsoft", "outlook"] } },
    select: { id: true, provider: true },
  });

  const appUrl = getAppUrl();
  const googleAuthUrl = getGoogleAuthUrl(appUrl, eventId);
  const microsoftAuthUrl = microsoftConfigured()
    ? getMicrosoftAuthUrl(appUrl, eventId)
    : null;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.06em] text-bronze-600">
          {attendee.event.name}
        </p>
        <h1 className="mt-1 font-display text-3xl text-ink-800">Calendar</h1>
        <p className="mt-1 text-sm text-stone-700">
          Connect your calendar to automatically receive meeting invites.
        </p>
      </div>
      <CalendarPanel
        eventId={eventId}
        connections={connections}
        googleAuthUrl={googleAuthUrl}
        microsoftAuthUrl={microsoftAuthUrl}
        oauthError={oauthError}
      />
    </div>
  );
}
