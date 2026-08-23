import { Suspense } from "react";
import { prisma } from "@/lib/db/prisma";
import { requireEvent } from "@/lib/authz/require";
import { safe } from "@/lib/authz/safe";
import { hasPermission } from "@/lib/authz/permissions";
import { displayName } from "@/lib/utils";
import { MeetingsPanel } from "./meetings-panel";

function toDatetimeLocalValue(date: Date | null | undefined) {
  if (!date) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

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
      <Suspense fallback={<div className="h-40 rounded-xl bg-white shadow-sm" />}>
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
            roomId: row.roomId,
            when: row.startsAt?.toLocaleString("en-GB") ?? "",
            startsAtLocal: toDatetimeLocalValue(row.startsAt),
            endsAtLocal: toDatetimeLocalValue(row.endsAt),
            participants: row.participants
              .map((participant) => displayName(participant.attendee))
              .join(" · "),
          }))}
        />
      </Suspense>
    </div>
  );
}
