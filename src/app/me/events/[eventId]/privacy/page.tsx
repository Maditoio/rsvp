import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/authz/require";
import { safe } from "@/lib/authz/safe";
import { AuthzError } from "@/lib/db/tenant";
import { PrivacyForm } from "./privacy-form";
import { PageHeader } from "@/components/ui/page-header";

export default async function AttendeePrivacyPage({
  params,
}: PageProps<"/me/events/[eventId]/privacy">) {
  const { eventId } = await params;
  const user = await safe(() => requireUser());
  const attendee = await prisma.attendee.findFirst({
    where: { eventId, userId: user.id },
    include: {
      privacy: true,
      event: { select: { name: true, settings: true } },
    },
  });
  if (!attendee) {
    await safe(async () => {
      throw new AuthzError("You are not registered for this event", 403);
    });
    return null;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={attendee.event.name}
        title="Privacy"
        description="Control what other attendees can see. Matching uses shared objectives from your matching profile; AI explanations are optional and only appear in Directory when both the organiser and you enable them. Organisers still see your registration record."
      />
      <PrivacyForm
        eventId={eventId}
        eventAiEnabled={attendee.event.settings?.aiInsightsEnabled ?? false}
        privacy={{
          profileVisible: attendee.privacy?.profileVisible ?? true,
          matchmakingEnabled: attendee.privacy?.matchmakingEnabled ?? false,
          showEmail: attendee.privacy?.showEmail ?? false,
          showPhone: attendee.privacy?.showPhone ?? false,
          aiInsightsOptIn: attendee.privacy?.aiInsightsOptIn ?? false,
        }}
      />
    </div>
  );
}
