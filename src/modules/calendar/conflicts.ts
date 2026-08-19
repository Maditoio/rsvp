import { prisma } from "@/lib/db/prisma";
import {
  fetchGoogleFreeBusy,
  getValidGoogleAccessToken,
  type CalendarConnectionRecord,
} from "./google";

export interface TimeBlock {
  start: Date;
  end: Date;
}

function blocksOverlap(a: TimeBlock, b: TimeBlock): boolean {
  return a.start < b.end && b.start < a.end;
}

async function googleBusyBlocksForConnection(
  connection: CalendarConnectionRecord,
  timeMin: Date,
  timeMax: Date,
): Promise<TimeBlock[]> {
  if (connection.provider !== "google") return [];
  const accessToken = await getValidGoogleAccessToken(connection);
  return fetchGoogleFreeBusy(accessToken, timeMin, timeMax);
}

/** Load Google Calendar busy blocks per attendee for a date range. */
export async function loadGoogleBusyByAttendee(
  attendeeIds: string[],
  timeMin: Date,
  timeMax: Date,
): Promise<Map<string, TimeBlock[]>> {
  const result = new Map<string, TimeBlock[]>();
  for (const id of attendeeIds) {
    result.set(id, []);
  }

  const attendees = await prisma.attendee.findMany({
    where: { id: { in: attendeeIds }, userId: { not: null } },
    select: { id: true, userId: true },
  });
  if (attendees.length === 0) return result;

  const userIds = attendees
    .map((a) => a.userId)
    .filter((id): id is string => id !== null);

  const connections = await prisma.calendarConnection.findMany({
    where: { userId: { in: userIds }, provider: "google" },
  });
  const connByUser = new Map(connections.map((c) => [c.userId, c]));

  await Promise.all(
    attendees.map(async (attendee) => {
      if (!attendee.userId) return;
      const conn = connByUser.get(attendee.userId);
      if (!conn) return;
      try {
        const blocks = await googleBusyBlocksForConnection(conn, timeMin, timeMax);
        result.set(attendee.id, blocks);
      } catch {
        result.set(attendee.id, []);
      }
    }),
  );

  return result;
}

export async function checkPlatformParticipantConflicts(
  eventId: string,
  attendeeIds: string[],
  startsAt: Date,
  endsAt: Date,
  excludeMeetingId?: string,
): Promise<string | null> {
  const conflict = await prisma.meeting.findFirst({
    where: {
      eventId,
      status: { not: "CANCELLED" },
      ...(excludeMeetingId ? { id: { not: excludeMeetingId } } : {}),
      startsAt: { lt: endsAt },
      endsAt: { gt: startsAt },
      participants: { some: { attendeeId: { in: attendeeIds } } },
    },
    include: {
      participants: {
        where: { attendeeId: { in: attendeeIds } },
        include: {
          attendee: { select: { firstName: true, lastName: true } },
        },
      },
    },
  });

  if (!conflict) return null;

  const name = conflict.participants[0]?.attendee;
  const who = name
    ? `${name.firstName} ${name.lastName}`.trim()
    : "A participant";
  return `${who} already has another meeting scheduled at this time in the event.`;
}

export async function checkGoogleCalendarConflicts(
  attendeeIds: string[],
  startsAt: Date,
  endsAt: Date,
): Promise<string | null> {
  const attendees = await prisma.attendee.findMany({
    where: { id: { in: attendeeIds } },
    select: { id: true, firstName: true, lastName: true, userId: true },
  });

  const candidate: TimeBlock = { start: startsAt, end: endsAt };
  const rangeStart = new Date(startsAt.getTime() - 60_000);
  const rangeEnd = new Date(endsAt.getTime() + 60_000);

  for (const attendee of attendees) {
    if (!attendee.userId) continue;

    const connection = await prisma.calendarConnection.findFirst({
      where: { userId: attendee.userId, provider: "google" },
    });
    if (!connection) continue;

    let blocks: TimeBlock[];
    try {
      blocks = await googleBusyBlocksForConnection(
        connection,
        rangeStart,
        rangeEnd,
      );
    } catch {
      const who = `${attendee.firstName} ${attendee.lastName}`.trim();
      throw new Error(
        `Could not read ${who}'s Google Calendar. Ask them to reconnect under Calendar settings.`,
      );
    }

    if (blocks.some((b) => blocksOverlap(candidate, b))) {
      const who = `${attendee.firstName} ${attendee.lastName}`.trim();
      return `${who} has another event in their Google Calendar at this time. Choose a different slot.`;
    }
  }

  return null;
}

export async function validateMeetingSlot(
  eventId: string,
  attendeeIds: string[],
  startsAt: Date,
  endsAt: Date,
  options?: { excludeMeetingId?: string; roomId?: string | null },
): Promise<void> {
  if (endsAt <= startsAt) {
    throw new Error("End time must be after start time");
  }

  if (options?.roomId) {
    const roomConflict = await prisma.meeting.findFirst({
      where: {
        ...(options.excludeMeetingId ? { id: { not: options.excludeMeetingId } } : {}),
        roomId: options.roomId,
        eventId,
        status: { not: "CANCELLED" },
        startsAt: { lt: endsAt },
        endsAt: { gt: startsAt },
      },
    });
    if (roomConflict) {
      throw new Error("This room is already booked for the selected time");
    }
  }

  const platformConflict = await checkPlatformParticipantConflicts(
    eventId,
    attendeeIds,
    startsAt,
    endsAt,
    options?.excludeMeetingId,
  );
  if (platformConflict) throw new Error(platformConflict);

  const googleConflict = await checkGoogleCalendarConflicts(
    attendeeIds,
    startsAt,
    endsAt,
  );
  if (googleConflict) throw new Error(googleConflict);
}

export function slotFreeOnGoogleCalendars(
  busyByAttendee: Map<string, TimeBlock[]>,
  attendeeIdA: string,
  attendeeIdB: string,
  candidate: TimeBlock,
): boolean {
  const aBusy = busyByAttendee.get(attendeeIdA) ?? [];
  const bBusy = busyByAttendee.get(attendeeIdB) ?? [];
  return (
    !aBusy.some((b) => blocksOverlap(candidate, b)) &&
    !bBusy.some((b) => blocksOverlap(candidate, b))
  );
}
