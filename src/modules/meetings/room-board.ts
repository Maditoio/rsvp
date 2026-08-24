import { prisma } from "@/lib/db/prisma";
import { displayName } from "@/lib/utils";

export type RoomBoardSlot = {
  startsAt: string;
  endsAt: string;
  label: string;
};

export type RoomBoardMeeting = {
  id: string;
  roomId: string;
  startsAt: string;
  endsAt: string;
  participants: string;
  status: string;
};

export type RoomBoardData = {
  rooms: { id: string; name: string }[];
  slots: RoomBoardSlot[];
  meetings: RoomBoardMeeting[];
  unassigned: RoomBoardMeeting[];
};

export async function loadRoomBoard(
  organisationId: string,
  eventId: string,
): Promise<RoomBoardData> {
  const event = await prisma.event.findFirst({
    where: { id: eventId, organisationId },
    include: { settings: true },
  });

  const [rooms, meetings] = await Promise.all([
    prisma.meetingRoom.findMany({
      where: { eventId, organisationId },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.meeting.findMany({
      where: {
        eventId,
        organisationId,
        status: { not: "CANCELLED" },
        startsAt: { not: null },
        endsAt: { not: null },
      },
      include: {
        participants: {
          include: { attendee: { select: { firstName: true, lastName: true } } },
        },
      },
      orderBy: { startsAt: "asc" },
    }),
  ]);

  const durationMinutes = event?.settings?.meetingDurationMinutes ?? 15;
  const slots: RoomBoardSlot[] = [];
  const slotSet = new Set<string>();

  for (const meeting of meetings) {
    if (!meeting.startsAt || !meeting.endsAt) continue;
    const key = meeting.startsAt.toISOString();
    if (slotSet.has(key)) continue;
    slotSet.add(key);
    slots.push({
      startsAt: meeting.startsAt.toISOString(),
      endsAt: meeting.endsAt.toISOString(),
      label: meeting.startsAt.toLocaleString("en-GB", {
        weekday: "short",
        hour: "2-digit",
        minute: "2-digit",
        timeZone: event?.timezone ?? "UTC",
      }),
    });
  }

  if (slots.length === 0 && event?.startsAt && event?.endsAt) {
    let cursor = new Date(event.startsAt);
    const end = event.endsAt;
    while (cursor.getTime() < end.getTime() && slots.length < 24) {
      const slotEnd = new Date(cursor.getTime() + durationMinutes * 60_000);
      slots.push({
        startsAt: cursor.toISOString(),
        endsAt: slotEnd.toISOString(),
        label: cursor.toLocaleString("en-GB", {
          weekday: "short",
          hour: "2-digit",
          minute: "2-digit",
          timeZone: event.timezone ?? "UTC",
        }),
      });
      cursor = new Date(slotEnd.getTime() + 5 * 60_000);
    }
  }

  const toBoardMeeting = (m: (typeof meetings)[number]): RoomBoardMeeting => ({
    id: m.id,
    roomId: m.roomId ?? "",
    startsAt: m.startsAt!.toISOString(),
    endsAt: m.endsAt!.toISOString(),
    participants: m.participants.map((p) => displayName(p.attendee)).join(" · "),
    status: m.status,
  });

  const assigned = meetings.filter((m) => m.roomId).map(toBoardMeeting);
  const unassigned = meetings.filter((m) => !m.roomId).map(toBoardMeeting);

  return {
    rooms,
    slots,
    meetings: assigned,
    unassigned,
  };
}
