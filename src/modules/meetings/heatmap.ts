import { prisma } from "@/lib/db/prisma";
import {
  eachCalendarDayInRange,
  utcFromZonedDateTime,
} from "@/lib/timezone";

export type HeatmapCell = {
  dayKey: string;
  dayLabel: string;
  hour: number;
  demand: number;
  scheduled: number;
  overloaded: boolean;
};

function parseTimeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60_000);
}

export async function computeSlotHeatmap(
  organisationId: string,
  eventId: string,
): Promise<{ cells: HeatmapCell[]; maxDemand: number; roomCount: number }> {
  const event = await prisma.event.findFirst({
    where: { id: eventId, organisationId },
    include: { settings: true },
  });
  if (!event?.startsAt || !event.endsAt) {
    return { cells: [], maxDemand: 0, roomCount: 0 };
  }

  const durationMinutes = event.settings?.meetingDurationMinutes ?? 15;
  const eventStartTime = event.settings?.eventStartTime ?? "09:00";
  const eventEndTime = event.settings?.eventEndTime ?? "18:00";
  const startMinutes = parseTimeToMinutes(eventStartTime);
  const endMinutes = parseTimeToMinutes(eventEndTime);
  const dayStartHour = Math.floor(startMinutes / 60);
  const dayStartMinute = startMinutes % 60;
  const dayEndHour = Math.floor(endMinutes / 60);
  const timeZone = event.timezone || "UTC";

  const [rooms, meetings, attendeeCount] = await Promise.all([
    prisma.meetingRoom.count({ where: { eventId, organisationId } }),
    prisma.meeting.findMany({
      where: {
        eventId,
        organisationId,
        status: { not: "CANCELLED" },
        startsAt: { not: null },
        endsAt: { not: null },
      },
      select: { startsAt: true, endsAt: true },
    }),
    prisma.attendee.count({ where: { eventId, organisationId } }),
  ]);

  const pairCount = Math.max(1, Math.floor((attendeeCount * (attendeeCount - 1)) / 2));
  const demandScale = Math.max(1, Math.ceil(pairCount / 40));

  const cellMap = new Map<string, { demand: number; scheduled: number }>();
  const days = eachCalendarDayInRange(event.startsAt, event.endsAt, timeZone);

  for (const day of days) {
    const dayStart = utcFromZonedDateTime(
      day.year,
      day.month,
      day.day,
      dayStartHour,
      dayStartMinute,
      timeZone,
    );
    const dayEnd = utcFromZonedDateTime(
      day.year,
      day.month,
      day.day,
      dayEndHour,
      endMinutes % 60,
      timeZone,
    );

    let slotStart =
      dayStart.getTime() < event.startsAt.getTime() ? event.startsAt : dayStart;
    const dayKey = `${day.year}-${String(day.month).padStart(2, "0")}-${String(day.day).padStart(2, "0")}`;
    const dayLabel = new Intl.DateTimeFormat("en-GB", {
      weekday: "short",
      month: "short",
      day: "numeric",
      timeZone,
    }).format(slotStart);

    while (addMinutes(slotStart, durationMinutes).getTime() <= dayEnd.getTime()) {
      const slotEnd = addMinutes(slotStart, durationMinutes);
      if (slotEnd.getTime() > event.endsAt.getTime()) break;

      const hour = new Intl.DateTimeFormat("en-GB", {
        hour: "numeric",
        hour12: false,
        timeZone,
      }).format(slotStart);
      const hourNum = Number(hour);
      const key = `${dayKey}:${hourNum}`;

      const scheduledInSlot = meetings.filter(
        (m) =>
          m.startsAt &&
          m.startsAt.getTime() < slotEnd.getTime() &&
          (m.endsAt?.getTime() ?? 0) > slotStart.getTime(),
      ).length;

      const baseDemand = Math.min(
        demandScale,
        1 + Math.floor(scheduledInSlot * 0.6) + (hourNum >= 10 && hourNum <= 15 ? 1 : 0),
      );

      const existing = cellMap.get(key) ?? { demand: 0, scheduled: 0 };
      cellMap.set(key, {
        demand: existing.demand + baseDemand,
        scheduled: existing.scheduled + scheduledInSlot,
      });

      slotStart = addMinutes(slotStart, durationMinutes + 5);
    }
  }

  let maxDemand = 0;
  const cells: HeatmapCell[] = [];

  for (const [key, value] of cellMap) {
    const [dayKey, hourStr] = key.split(":");
    const hour = Number(hourStr);
    maxDemand = Math.max(maxDemand, value.demand);
    const dayLabel = new Intl.DateTimeFormat("en-GB", {
      weekday: "short",
      month: "short",
      day: "numeric",
      timeZone,
    }).format(
      utcFromZonedDateTime(
        Number(dayKey.slice(0, 4)),
        Number(dayKey.slice(5, 7)),
        Number(dayKey.slice(8, 10)),
        hour,
        0,
        timeZone,
      ),
    );

    cells.push({
      dayKey,
      dayLabel,
      hour,
      demand: value.demand,
      scheduled: value.scheduled,
      overloaded: rooms > 0 && value.scheduled >= rooms,
    });
  }

  cells.sort((a, b) => a.dayKey.localeCompare(b.dayKey) || a.hour - b.hour);

  return { cells, maxDemand, roomCount: rooms };
}
