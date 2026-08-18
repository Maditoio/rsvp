import { prisma } from "@/lib/db/prisma";
import { requireEvent } from "@/lib/authz/require";
import { safe } from "@/lib/authz/safe";
import { hasPermission } from "@/lib/authz/permissions";
import { EventSubnav } from "@/components/event-subnav";
import { displayName } from "@/lib/utils";
import { MeetingsPanel } from "./meetings-panel";

export default async function EventMeetingsPage({
  params,
}: PageProps<"/app/[orgSlug]/events/[eventId]/meetings">) {
  const { orgSlug, eventId } = await params;
  const ctx = await safe(() => requireEvent(orgSlug, eventId, "event.read"));
  const [rooms, meetings] = await Promise.all([
    prisma.meetingRoom.findMany({
      where: { eventId, organisationId: ctx.organisation.id },
      orderBy: { name: "asc" },
    }),
    prisma.meeting.findMany({
      where: { eventId, organisationId: ctx.organisation.id },
      include: {
        room: { select: { name: true } },
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
    <div>
      <EventSubnav
        orgSlug={orgSlug}
        eventId={eventId}
        current="Meetings"
        grants={ctx.grants}
      />
      <MeetingsPanel
        orgSlug={orgSlug}
        eventId={eventId}
        canManage={hasPermission(ctx.grants, "event.update")}
        rooms={rooms.map((row) => ({
          id: row.id,
          name: row.name,
          capacity: row.capacity,
        }))}
        meetings={meetings.map((row) => ({
          id: row.id,
          status: row.status,
          room: row.room?.name ?? null,
          when: row.startsAt?.toLocaleString("en-GB") ?? "",
          participants: row.participants
            .map((participant) => displayName(participant.attendee))
            .join(" · "),
        }))}
      />
    </div>
  );
}
