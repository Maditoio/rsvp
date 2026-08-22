import { prisma } from "@/lib/db/prisma";
import {
  calendarDateInTimezone,
  compareCalendarDates,
  eachCalendarDayInRange,
} from "@/lib/timezone";
import {
  fetchGoogleFreeBusy,
  getValidGoogleAccessToken,
  type CalendarConnectionRecord,
} from "./google";
import {
  fetchMicrosoftFreeBusy,
  getValidMicrosoftAccessToken,
} from "./microsoft";

export interface TimeBlock {
  start: Date;
  end: Date;
}

function blocksOverlap(a: TimeBlock, b: TimeBlock): boolean {
  return a.start < b.end && b.start < a.end;
}

async function busyBlocksForConnection(
  connection: CalendarConnectionRecord & { user?: { email: string } },
  timeMin: Date,
  timeMax: Date,
): Promise<TimeBlock[]> {
  if (connection.provider === "google") {
    const accessToken = await getValidGoogleAccessToken(connection);
    return fetchGoogleFreeBusy(accessToken, timeMin, timeMax);
  }
  if (connection.provider === "microsoft") {
    const accessToken = await getValidMicrosoftAccessToken(connection);
    const email = (connection as { user?: { email: string } }).user?.email ?? "me";
    return fetchMicrosoftFreeBusy(accessToken, timeMin, timeMax, email);
  }
  return [];
}

/** Load calendar busy blocks per attendee (Google + Microsoft) for a date range. */
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
    where: { userId: { in: userIds }, provider: { in: ["google", "microsoft"] } },
    include: { user: { select: { email: true } } },
  });
  const connsByUser = new Map<string, (typeof connections)>();
  for (const c of connections) {
    const existing = connsByUser.get(c.userId) ?? [];
    existing.push(c);
    connsByUser.set(c.userId, existing);
  }

  await Promise.all(
    attendees.map(async (attendee) => {
      if (!attendee.userId) return;
      const conns = connsByUser.get(attendee.userId);
      if (!conns) return;
      const allBlocks: TimeBlock[] = [];
      for (const conn of conns) {
        try {
          const blocks = await busyBlocksForConnection(conn, timeMin, timeMax);
          allBlocks.push(...blocks);
        } catch {
          // skip failed connections
        }
      }
      result.set(attendee.id, allBlocks);
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

function sameBusyWindow(a: TimeBlock, b: TimeBlock, toleranceMs = 2_000): boolean {
  return (
    Math.abs(a.start.getTime() - b.start.getTime()) <= toleranceMs &&
    Math.abs(a.end.getTime() - b.end.getTime()) <= toleranceMs
  );
}

export async function checkGoogleCalendarConflicts(
  attendeeIds: string[],
  startsAt: Date,
  endsAt: Date,
  options?: { ignoreBlock?: TimeBlock },
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

    const connections = await prisma.calendarConnection.findMany({
      where: { userId: attendee.userId, provider: { in: ["google", "microsoft"] } },
      include: { user: { select: { email: true } } },
    });
    if (connections.length === 0) continue;

    for (const connection of connections) {
      let blocks: TimeBlock[];
      try {
        blocks = await busyBlocksForConnection(connection, rangeStart, rangeEnd);
      } catch {
        const who = `${attendee.firstName} ${attendee.lastName}`.trim();
        const provider = connection.provider === "microsoft" ? "Outlook" : "Google";
        throw new Error(
          `Could not read ${who}'s ${provider} Calendar. Ask them to reconnect under Calendar settings.`,
        );
      }

      const relevant = options?.ignoreBlock
        ? blocks.filter((b) => !sameBusyWindow(b, options.ignoreBlock!))
        : blocks;

      if (relevant.some((b) => blocksOverlap(candidate, b))) {
        const who = `${attendee.firstName} ${attendee.lastName}`.trim();
        const provider = connection.provider === "microsoft" ? "Outlook" : "Google";
        return `${who} has another event in their ${provider} Calendar at this time. Choose a different slot.`;
      }
    }
  }

  return null;
}

export async function validateMeetingWithinEventDates(
  eventId: string,
  startsAt: Date,
  endsAt: Date,
): Promise<string | null> {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { startsAt: true, endsAt: true, timezone: true, name: true },
  });
  if (!event?.startsAt || !event?.endsAt) {
    return "Set the event start and end dates in event settings before scheduling meetings.";
  }

  const timeZone = event.timezone || "UTC";
  const eventDays = eachCalendarDayInRange(event.startsAt, event.endsAt, timeZone);
  if (eventDays.length === 0) {
    return "This event has no valid calendar dates. Update the event start and end dates.";
  }

  const startDay = calendarDateInTimezone(startsAt, timeZone);
  const endDay = calendarDateInTimezone(endsAt, timeZone);
  const first = eventDays[0];
  const last = eventDays[eventDays.length - 1];

  const startOk =
    compareCalendarDates(startDay, first) >= 0 &&
    compareCalendarDates(startDay, last) <= 0;
  const endOk =
    compareCalendarDates(endDay, first) >= 0 &&
    compareCalendarDates(endDay, last) <= 0;

  if (!startOk || !endOk) {
    const labels = eventDays.map((day) =>
      new Intl.DateTimeFormat("en-GB", {
        weekday: "short",
        day: "numeric",
        month: "short",
        timeZone,
      }).format(new Date(Date.UTC(day.year, day.month - 1, day.day, 12, 0))),
    );
    return `Choose a time on one of the event dates (${labels.join(", ")}). The selected slot falls outside the event calendar.`;
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

  const eventDateConflict = await validateMeetingWithinEventDates(
    eventId,
    startsAt,
    endsAt,
  );
  if (eventDateConflict) throw new Error(eventDateConflict);

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

  let ignoreBlock: TimeBlock | undefined;
  if (options?.excludeMeetingId) {
    const existing = await prisma.meeting.findUnique({
      where: { id: options.excludeMeetingId },
      select: { startsAt: true, endsAt: true },
    });
    if (existing?.startsAt && existing?.endsAt) {
      ignoreBlock = { start: existing.startsAt, end: existing.endsAt };
    }
  }

  const googleConflict = await checkGoogleCalendarConflicts(
    attendeeIds,
    startsAt,
    endsAt,
    ignoreBlock ? { ignoreBlock } : undefined,
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
