import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/authz/require";
import { safe } from "@/lib/authz/safe";
import { AuthzError } from "@/lib/db/tenant";
import { displayName } from "@/lib/utils";
import { AttendeeMeetingsPanel } from "./meetings-panel";

export default async function AttendeeMeetingsPage({
  params,
}: PageProps<"/me/events/[eventId]/meetings">) {
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

  const counterpart = {
    select: { firstName: true, lastName: true, company: true },
  } as const;

  const [incoming, outgoing, meetings] = await Promise.all([
    prisma.meetingRequest.findMany({
      where: {
        eventId,
        organisationId: attendee.organisationId,
        targetId: attendee.id,
        status: "PENDING",
      },
      include: { requester: counterpart },
      orderBy: { createdAt: "desc" },
    }),
    prisma.meetingRequest.findMany({
      where: {
        eventId,
        organisationId: attendee.organisationId,
        requesterId: attendee.id,
      },
      include: { target: counterpart },
      orderBy: { createdAt: "desc" },
    }),
    prisma.meeting.findMany({
      where: {
        eventId,
        organisationId: attendee.organisationId,
        participants: { some: { attendeeId: attendee.id } },
      },
      include: {
        participants: {
          include: {
            attendee: { select: { firstName: true, lastName: true } },
          },
        },
      },
      orderBy: { startsAt: "asc" },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.06em] text-bronze-600">
          {attendee.event.name}
        </p>
        <h1 className="mt-1 font-display text-3xl text-ink-800">Meetings</h1>
        <p className="mt-1 text-sm text-stone-700">
          Accepting a request creates a meeting. Rooms are assigned by the
          organiser.
        </p>
      </div>
      <AttendeeMeetingsPanel
        eventId={eventId}
        incoming={incoming.map((row) => ({
          id: row.id,
          status: row.status,
          message: row.message,
          counterpart: row.requester,
          inbound: true,
          createdAt: row.createdAt.toLocaleDateString("en-GB"),
        }))}
        outgoing={outgoing.map((row) => ({
          id: row.id,
          status: row.status,
          message: row.message,
          counterpart: row.target,
          inbound: false,
          createdAt: row.createdAt.toLocaleDateString("en-GB"),
        }))}
        meetings={meetings.map((row) => ({
          id: row.id,
          status: row.status,
          when: row.startsAt?.toLocaleString("en-GB") ?? "",
          participants: row.participants
            .map((participant) => displayName(participant.attendee))
            .join(" · "),
        }))}
      />
    </div>
  );
}
