import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/authz/require";
import { safe } from "@/lib/authz/safe";
import { AuthzError } from "@/lib/db/tenant";
import { rankedDirectory } from "@/modules/matchmaking/basic";
import { DirectoryPanel } from "./directory-panel";
import { PageHeader } from "@/components/ui/page-header";

export default async function DirectoryPage({
  params,
}: PageProps<"/me/events/[eventId]/directory">) {
  const { eventId } = await params;
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
  const directory = await rankedDirectory(eventId);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={attendee.event.name}
        title="Directory"
        description={
          directory.eventAiEnabled
            ? "AI-assisted discovery ranks attendees by complementarity. Review recommendations, see why a match fits, then connect."
            : "Matched on shared objectives — complementary looking-for and offering, industries, geographies, and meeting preferences."
        }
      />
      <DirectoryPanel
        eventId={eventId}
        eventName={attendee.event.name}
        forYou={directory.forYou}
        people={directory.people}
        eventAiEnabled={directory.eventAiEnabled}
        attendeeOptIn={directory.attendeeOptIn}
        questionnaireComplete={directory.questionnaireComplete}
        matchmakingEnabled={directory.matchmakingEnabled}
      />
    </div>
  );
}
