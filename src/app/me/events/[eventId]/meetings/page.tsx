import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/authz/require";
import { safe } from "@/lib/authz/safe";
import { AuthzError } from "@/lib/db/tenant";
import { displayName } from "@/lib/utils";
import { Suspense } from "react";
import { MeetingsResponseToast } from "@/components/meetings-response-toast";
import { AttendeeMeetingsPanel } from "./meetings-panel";

function formatMeetingDate(date: Date, timezone: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: timezone,
  }).format(date);
}

function formatMeetingTime(date: Date, timezone: string) {
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: timezone,
  }).format(date);
}

function calendarDayKey(date: Date, timezone: string) {
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: timezone,
  }).format(date);
}

export default async function AttendeeMeetingsPage({
  params,
}: PageProps<"/me/events/[eventId]/meetings">) {
  const { eventId } = await params;
  const user = await safe(() => requireUser());
  const attendee = await prisma.attendee.findFirst({
    where: { eventId, userId: user.id },
    include: {
      event: { select: { name: true, timezone: true } },
    },
  });
  if (!attendee) {
    await safe(async () => {
      throw new AuthzError("You are not registered for this event", 403);
    });
    return null;
  }

  const timezone = attendee.event.timezone || "UTC";
  const counterpart = {
    select: { firstName: true, lastName: true, company: true },
  } as const;

  const rooms = await prisma.meetingRoom.findMany({
    where: { eventId, organisationId: attendee.organisationId },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

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
        room: { select: { name: true } },
        participants: {
          include: {
            attendee: {
              select: { id: true, firstName: true, lastName: true },
            },
          },
        },
      },
      orderBy: { startsAt: "asc" },
    }),
  ]);

  const now = new Date();
  const todayKey = calendarDayKey(now, timezone);

  const meetingRows = meetings.map((row) => {
    const others = row.participants
      .filter((p) => p.attendee.id !== attendee.id)
      .map((p) => displayName(p.attendee));
    const title =
      others.length > 0
        ? `${displayName(attendee)} × ${others.join(" · ")}`
        : "Meeting";
    const startsAt = row.startsAt;
    const endsAt = row.endsAt;
    const durationMins =
      startsAt && endsAt
        ? Math.max(1, Math.round((endsAt.getTime() - startsAt.getTime()) / 60_000))
        : null;
    const isPast =
      row.status === "COMPLETED" ||
      row.status === "CANCELLED" ||
      row.status === "NO_SHOW" ||
      (endsAt != null && endsAt < now);
    const dayKey = startsAt ? calendarDayKey(startsAt, timezone) : null;

    return {
      id: row.id,
      title,
      counterpartInitials: (others[0] ?? "M")
        .split(/\s+/)
        .map((part) => part[0])
        .join("")
        .slice(0, 2)
        .toUpperCase(),
      eventName: attendee.event.name,
      status: row.status,
      dateLabel: startsAt ? formatMeetingDate(startsAt, timezone) : null,
      timeLabel:
        startsAt && endsAt
          ? `${formatMeetingTime(startsAt, timezone)} – ${formatMeetingTime(endsAt, timezone)}`
          : startsAt
            ? formatMeetingTime(startsAt, timezone)
            : null,
      room: row.room?.name ?? null,
      roomId: row.roomId,
      durationMins,
      isPast,
      isToday: dayKey === todayKey && !isPast,
      startsAtIso: startsAt?.toISOString() ?? null,
      endsAtIso: endsAt?.toISOString() ?? null,
    };
  });

  return (
    <>
      <Suspense fallback={null}>
        <MeetingsResponseToast />
      </Suspense>
      <AttendeeMeetingsPanel
      eventId={eventId}
      eventName={attendee.event.name}
      rooms={rooms}
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
      meetings={meetingRows}
    />
    </>
  );
}
