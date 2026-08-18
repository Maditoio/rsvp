import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/authz/require";
import { safe } from "@/lib/authz/safe";
import { AuthzError } from "@/lib/db/tenant";
import { AttendeeEventNav } from "@/components/attendee-event-nav";
import { PrivacyForm } from "./privacy-form";

export default async function AttendeePrivacyPage({
  params,
}: PageProps<"/me/events/[eventId]/privacy">) {
  const { eventId } = await params;
  const user = await safe(() => requireUser());
  const attendee = await prisma.attendee.findFirst({
    where: { eventId, userId: user.id },
    include: { privacy: true, event: { select: { name: true } } },
  });
  if (!attendee) {
    await safe(async () => {
      throw new AuthzError("You are not registered for this event", 403);
    });
    return null;
  }

  return (
    <div className="space-y-6">
      <AttendeeEventNav eventId={eventId} current="Privacy" />
      <div>
        <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.06em] text-bronze-600">
          {attendee.event.name}
        </p>
        <h1 className="mt-1 font-display text-3xl text-ink-800">Privacy</h1>
        <p className="mt-1 text-sm text-stone-700">
          Control what other attendees can see. Organisers still see your
          registration record.
        </p>
      </div>
      <PrivacyForm
        eventId={eventId}
        privacy={{
          profileVisible: attendee.privacy?.profileVisible ?? true,
          matchmakingEnabled: attendee.privacy?.matchmakingEnabled ?? false,
          showEmail: attendee.privacy?.showEmail ?? false,
          showPhone: attendee.privacy?.showPhone ?? false,
        }}
      />
    </div>
  );
}
