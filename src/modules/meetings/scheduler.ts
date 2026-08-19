import { prisma } from "@/lib/db/prisma";
import {
  loadGoogleBusyByAttendee,
  slotFreeOnGoogleCalendars,
} from "@/modules/calendar/conflicts";

const BUFFER_MINUTES = 5;

interface SlotResult {
  startsAt: Date;
  endsAt: Date;
  roomId: string;
  roomName: string;
}

function parseTimeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60_000);
}

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

interface TimeBlock {
  start: Date;
  end: Date;
}

function blocksOverlap(a: TimeBlock, b: TimeBlock): boolean {
  return a.start < b.end && b.start < a.end;
}

export class AutoScheduleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AutoScheduleError";
  }
}

export async function findAvailableSlots(
  eventId: string,
  attendeeIdA: string,
  attendeeIdB: string,
  options?: { durationMinutes?: number },
): Promise<SlotResult[]> {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: { settings: true },
  });
  if (!event || !event.startsAt || !event.endsAt) return [];

  const attendeeIds = [attendeeIdA, attendeeIdB];

  const googleBusyByAttendee = await loadGoogleBusyByAttendee(
    attendeeIds,
    event.startsAt,
    event.endsAt,
  );

  const durationMinutes =
    options?.durationMinutes ?? event.settings?.meetingDurationMinutes ?? 15;
  const eventStartTime = event.settings?.eventStartTime ?? "09:00";
  const eventEndTime = event.settings?.eventEndTime ?? "18:00";
  const startMinutes = parseTimeToMinutes(eventStartTime);
  const endMinutes = parseTimeToMinutes(eventEndTime);

  const [existingMeetings, sessionRegs, rooms] = await Promise.all([
    prisma.meeting.findMany({
      where: {
        eventId,
        status: { not: "CANCELLED" },
        participants: { some: { attendeeId: { in: attendeeIds } } },
        startsAt: { not: null },
        endsAt: { not: null },
      },
      select: { startsAt: true, endsAt: true, roomId: true, participants: { select: { attendeeId: true } } },
    }),
    prisma.sessionRegistration.findMany({
      where: { eventId, attendeeId: { in: attendeeIds } },
      include: { session: { select: { startsAt: true, endsAt: true } } },
    }),
    prisma.meetingRoom.findMany({
      where: { eventId, organisationId: event.organisationId },
      select: { id: true, name: true },
    }),
  ]);

  if (rooms.length === 0) return [];

  const busyBlocksA: TimeBlock[] = [];
  const busyBlocksB: TimeBlock[] = [];

  for (const m of existingMeetings) {
    if (!m.startsAt || !m.endsAt) continue;
    const block: TimeBlock = {
      start: addMinutes(m.startsAt, -BUFFER_MINUTES),
      end: addMinutes(m.endsAt, BUFFER_MINUTES),
    };
    for (const p of m.participants) {
      if (p.attendeeId === attendeeIdA) busyBlocksA.push(block);
      if (p.attendeeId === attendeeIdB) busyBlocksB.push(block);
    }
  }

  for (const sr of sessionRegs) {
    if (!sr.session.startsAt || !sr.session.endsAt) continue;
    const block: TimeBlock = { start: sr.session.startsAt, end: sr.session.endsAt };
    if (sr.attendeeId === attendeeIdA) busyBlocksA.push(block);
    if (sr.attendeeId === attendeeIdB) busyBlocksB.push(block);
  }

  const roomMeetings = await prisma.meeting.findMany({
    where: {
      eventId,
      status: { not: "CANCELLED" },
      roomId: { not: null },
      startsAt: { not: null },
      endsAt: { not: null },
    },
    select: { startsAt: true, endsAt: true, roomId: true },
  });

  const roomBusy = new Map<string, TimeBlock[]>();
  for (const m of roomMeetings) {
    if (!m.startsAt || !m.endsAt || !m.roomId) continue;
    const blocks = roomBusy.get(m.roomId) ?? [];
    blocks.push({ start: m.startsAt, end: m.endsAt });
    roomBusy.set(m.roomId, blocks);
  }

  const results: SlotResult[] = [];
  const eventStart = event.startsAt;
  const eventEnd = event.endsAt;

  let currentDay = startOfDay(eventStart);
  const lastDay = startOfDay(eventEnd);

  while (currentDay <= lastDay) {
    const dayStart = new Date(currentDay);
    dayStart.setHours(0, startMinutes / 60 | 0, startMinutes % 60, 0);
    const dayEnd = new Date(currentDay);
    dayEnd.setHours(0, endMinutes / 60 | 0, endMinutes % 60, 0);

    if (dayStart < eventStart) {
      currentDay = addMinutes(currentDay, 24 * 60);
      continue;
    }

    let slotStart = dayStart;
    while (addMinutes(slotStart, durationMinutes) <= dayEnd) {
      const slotEnd = addMinutes(slotStart, durationMinutes);
      const candidate: TimeBlock = { start: slotStart, end: slotEnd };

      const aFree = !busyBlocksA.some((b) => blocksOverlap(candidate, b));
      const bFree = !busyBlocksB.some((b) => blocksOverlap(candidate, b));
      const googleFree = slotFreeOnGoogleCalendars(
        googleBusyByAttendee,
        attendeeIdA,
        attendeeIdB,
        candidate,
      );

      if (aFree && bFree && googleFree) {
        for (const room of rooms) {
          const rBusy = roomBusy.get(room.id) ?? [];
          const roomFree = !rBusy.some((b) => blocksOverlap(candidate, b));
          if (roomFree) {
            results.push({
              startsAt: slotStart,
              endsAt: slotEnd,
              roomId: room.id,
              roomName: room.name,
            });
            break;
          }
        }
      }

      slotStart = addMinutes(slotStart, BUFFER_MINUTES + durationMinutes);
    }

    currentDay = addMinutes(currentDay, 24 * 60);
  }

  return results;
}

export async function autoScheduleMeeting(
  eventId: string,
  meetingId: string,
): Promise<SlotResult | null> {
  const meeting = await prisma.meeting.findUnique({
    where: { id: meetingId },
    include: { participants: { select: { attendeeId: true } } },
  });

  if (!meeting || meeting.participants.length < 2) {
    throw new AutoScheduleError("Meeting must have two participants to schedule.");
  }
  if (meeting.startsAt && meeting.endsAt) {
    throw new AutoScheduleError("This meeting already has a scheduled time.");
  }

  const [a, b] = meeting.participants;

  const rooms = await prisma.meetingRoom.count({
    where: { eventId, organisationId: meeting.organisationId },
  });
  if (rooms === 0) {
    throw new AutoScheduleError(
      "Add at least one meeting room before auto-scheduling.",
    );
  }

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { startsAt: true, endsAt: true },
  });
  if (!event?.startsAt || !event?.endsAt) {
    throw new AutoScheduleError("Set the event start and end dates before auto-scheduling.");
  }

  const slots = await findAvailableSlots(eventId, a.attendeeId, b.attendeeId);

  if (slots.length === 0) {
    throw new AutoScheduleError(
      "No available slots found. Check meeting rooms, event hours, existing meetings, agenda sessions, and Google Calendar availability.",
    );
  }

  const slot = slots[0];
  await prisma.meeting.update({
    where: { id: meetingId },
    data: {
      startsAt: slot.startsAt,
      endsAt: slot.endsAt,
      roomId: slot.roomId,
    },
  });

  return slot;
}
