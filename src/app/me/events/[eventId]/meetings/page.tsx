import Link from "next/link";
import { Suspense } from "react";
import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/authz/require";
import { safe } from "@/lib/authz/safe";
import { Card } from "@/components/ui/card";
import {
  peerDisplayName,
  redactAttendeeForViewer,
} from "@/modules/privacy";
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

function peerCounterpart(person: {
  firstName: string;
  lastName: string;
  company: string | null;
  jobTitle?: string | null;
  country?: string | null;
  email?: string;
  phone?: string | null;
  privacy: {
    profileVisible: boolean;
    showEmail: boolean;
    showPhone: boolean;
    visibility: unknown;
  } | null;
}) {
  const redacted = redactAttendeeForViewer(
    {
      firstName: person.firstName,
      lastName: person.lastName,
      company: person.company,
      jobTitle: person.jobTitle ?? null,
      country: person.country ?? null,
      email: person.email ?? "",
      phone: person.phone ?? null,
    },
    person.privacy,
    "peer",
    { requireListed: false },
  )!;
  return {
    firstName: redacted.firstName,
    lastName: redacted.lastName,
    company: redacted.company,
    displayName: peerDisplayName(redacted),
  };
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
    const event = await prisma.event.findFirst({
      where: { id: eventId },
      select: { name: true },
    });
    return (
      <Card className="mx-auto max-w-lg">
        <p className="text-[0.71875rem] font-semibold uppercase tracking-[0.04em] text-indigo-600">
          Meetings
        </p>
        <h1 className="mt-2 font-display text-3xl text-slate-900">
          Sign in with your attendee account
        </h1>
        <p className="mt-3 text-sm text-slate-700">
          {event
            ? `You're signed in, but this account is not linked to a registration for ${event.name}. Use the same email you registered with, or open My Events to find your invitations.`
            : "You're signed in, but this account is not linked to a registration for that event. Open My Events to find your invitations."}
        </p>
        <Link
          href="/me"
          className="mt-6 inline-flex h-10 items-center rounded-full bg-indigo-600 px-5 text-sm font-semibold text-white shadow-accent hover:bg-indigo-700"
        >
          Go to My Events
        </Link>
      </Card>
    );
  }

  const timezone = attendee.event.timezone || "UTC";
  const counterpart = {
    select: {
      firstName: true,
      lastName: true,
      company: true,
      jobTitle: true,
      privacy: {
        select: {
          profileVisible: true,
          showEmail: true,
          showPhone: true,
          visibility: true,
        },
      },
    },
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
              select: {
                id: true,
                firstName: true,
                lastName: true,
                company: true,
                privacy: {
                  select: {
                    profileVisible: true,
                    showEmail: true,
                    showPhone: true,
                    visibility: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { startsAt: "asc" },
    }),
  ]);

  const now = new Date();
  const todayKey = calendarDayKey(now, timezone);
  const selfLabel = peerDisplayName({
    firstName: attendee.firstName,
    lastName: attendee.lastName,
    company: attendee.company,
    jobTitle: null,
    country: null,
    email: null,
    phone: null,
    about: null,
    lookingFor: null,
    offering: null,
    interests: [],
    industry: null,
    website: null,
    photoUrl: null,
    linkedinUrl: null,
  });

  const meetingRows = meetings.map((row) => {
    const others = row.participants
      .filter((p) => p.attendee.id !== attendee.id)
      .map((p) => peerCounterpart(p.attendee).displayName);
    const title =
      others.length > 0 ? `${selfLabel} × ${others.join(" · ")}` : "Meeting";
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
          counterpart: peerCounterpart(row.requester),
          inbound: true,
          createdAt: row.createdAt.toLocaleDateString("en-GB"),
        }))}
        outgoing={outgoing.map((row) => ({
          id: row.id,
          status: row.status,
          message: row.message,
          counterpart: peerCounterpart(row.target),
          inbound: false,
          createdAt: row.createdAt.toLocaleDateString("en-GB"),
        }))}
        meetings={meetingRows}
      />
    </>
  );
}
