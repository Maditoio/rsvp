import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/authz/require";
import { safe } from "@/lib/authz/safe";
import { AuthzError } from "@/lib/db/tenant";
import { rankedDirectory } from "@/modules/matchmaking/basic";
import { DirectoryPanel } from "./directory-panel";

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
      <div>
        <p className="text-[0.71875rem] font-semibold uppercase tracking-[0.04em] text-indigo-600">
          {attendee.event.name}
        </p>
        <h1 className="mt-1 font-display text-3xl text-slate-900">Directory</h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-700">
          {directory.eventAiEnabled
            ? "AI-assisted discovery ranks attendees by complementarity. Review recommendations, see why a match fits, then connect."
            : "Matched on shared objectives — complementary looking-for and offering, industries, geographies, and meeting preferences."}
        </p>
      </div>
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
