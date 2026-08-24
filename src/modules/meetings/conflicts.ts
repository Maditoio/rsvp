import { prisma } from "@/lib/db/prisma";
import { displayName } from "@/lib/utils";
import { loadMeetingCalendarStatuses } from "./calendar-status";

export type MeetingConflictKind =
  | "room_double_booked"
  | "session_clash"
  | "calendar_sync";

export type MeetingConflictItem = {
  id: string;
  kind: MeetingConflictKind;
  meetingId: string;
  participants: string;
  summary: string;
  detail: string;
  when: string | null;
  room: string | null;
};

function blocksOverlap(
  aStart: Date,
  aEnd: Date,
  bStart: Date,
  bEnd: Date,
): boolean {
  return aStart < bEnd && bStart < aEnd;
}

export async function loadMeetingConflicts(
  organisationId: string,
  eventId: string,
): Promise<MeetingConflictItem[]> {
  const meetings = await prisma.meeting.findMany({
    where: {
      eventId,
      organisationId,
      status: { not: "CANCELLED" },
      startsAt: { not: null },
      endsAt: { not: null },
    },
    include: {
      room: { select: { id: true, name: true } },
      participants: {
        include: {
          attendee: { select: { id: true, firstName: true, lastName: true } },
        },
      },
    },
    orderBy: { startsAt: "asc" },
  });

  const conflicts: MeetingConflictItem[] = [];
  let conflictIndex = 0;

  const withRoom = meetings.filter((m) => m.roomId && m.startsAt && m.endsAt);
  for (let i = 0; i < withRoom.length; i += 1) {
    const a = withRoom[i];
    for (let j = i + 1; j < withRoom.length; j += 1) {
      const b = withRoom[j];
      if (a.roomId !== b.roomId || !a.startsAt || !a.endsAt || !b.startsAt || !b.endsAt) {
        continue;
      }
      if (!blocksOverlap(a.startsAt, a.endsAt, b.startsAt, b.endsAt)) continue;

      const participantsA = a.participants.map((p) => displayName(p.attendee)).join(" · ");
      const participantsB = b.participants.map((p) => displayName(p.attendee)).join(" · ");
      conflicts.push({
        id: `room-${a.id}-${b.id}`,
        kind: "room_double_booked",
        meetingId: a.id,
        participants: participantsA,
        summary: `${a.room?.name ?? "Room"} double-booked`,
        detail: `Overlaps with ${participantsB} (${b.startsAt.toLocaleString("en-GB")} – ${b.endsAt.toLocaleString("en-GB", { hour: "2-digit", minute: "2-digit" })})`,
        when: a.startsAt.toLocaleString("en-GB"),
        room: a.room?.name ?? null,
      });
      conflicts.push({
        id: `room-${b.id}-${a.id}`,
        kind: "room_double_booked",
        meetingId: b.id,
        participants: participantsB,
        summary: `${b.room?.name ?? "Room"} double-booked`,
        detail: `Overlaps with ${participantsA} (${a.startsAt.toLocaleString("en-GB")} – ${a.endsAt.toLocaleString("en-GB", { hour: "2-digit", minute: "2-digit" })})`,
        when: b.startsAt.toLocaleString("en-GB"),
        room: b.room?.name ?? null,
      });
      conflictIndex += 2;
      if (conflictIndex > 200) break;
    }
    if (conflictIndex > 200) break;
  }

  const attendeeIds = [
    ...new Set(meetings.flatMap((m) => m.participants.map((p) => p.attendee.id))),
  ];

  const sessionRegs =
    attendeeIds.length > 0
      ? await prisma.sessionRegistration.findMany({
          where: { eventId, attendeeId: { in: attendeeIds } },
          include: {
            session: { select: { title: true, startsAt: true, endsAt: true } },
            attendee: { select: { id: true, firstName: true, lastName: true } },
          },
        })
      : [];

  const regsByAttendee = new Map<string, typeof sessionRegs>();
  for (const reg of sessionRegs) {
    const list = regsByAttendee.get(reg.attendeeId) ?? [];
    list.push(reg);
    regsByAttendee.set(reg.attendeeId, list);
  }

  for (const meeting of meetings) {
    if (!meeting.startsAt || !meeting.endsAt) continue;
    for (const participant of meeting.participants) {
      const regs = regsByAttendee.get(participant.attendee.id) ?? [];
      for (const reg of regs) {
        const session = reg.session;
        if (!session.startsAt || !session.endsAt) continue;
        if (
          !blocksOverlap(
            meeting.startsAt,
            meeting.endsAt,
            session.startsAt,
            session.endsAt,
          )
        ) {
          continue;
        }
        conflicts.push({
          id: `session-${meeting.id}-${reg.attendeeId}-${session.title}`,
          kind: "session_clash",
          meetingId: meeting.id,
          participants: meeting.participants
            .map((p) => displayName(p.attendee))
            .join(" · "),
          summary: `${displayName(reg.attendee)} registered for "${session.title}"`,
          detail: `Session ${session.startsAt.toLocaleString("en-GB")} – ${session.endsAt.toLocaleString("en-GB", { hour: "2-digit", minute: "2-digit" })} overlaps this meeting.`,
          when: meeting.startsAt.toLocaleString("en-GB"),
          room: meeting.room?.name ?? null,
        });
      }
    }
  }

  const calendarStatuses = await loadMeetingCalendarStatuses(
    organisationId,
    eventId,
    meetings.map((m) => m.id),
  );

  for (const meeting of meetings) {
    const cal = calendarStatuses.get(meeting.id);
    if (!cal || cal.status === "synced" || cal.status === "not_applicable") continue;
    if (cal.warnings.length === 0 && cal.status === "none") {
      cal.warnings.push("Calendar sync has not completed for one or more participants.");
    }
    for (const warning of cal.warnings) {
      conflicts.push({
        id: `cal-${meeting.id}-${warning.slice(0, 24)}`,
        kind: "calendar_sync",
        meetingId: meeting.id,
        participants: meeting.participants
          .map((p) => displayName(p.attendee))
          .join(" · "),
        summary: cal.status === "partial" ? "Partial calendar sync" : "Calendar sync issue",
        detail: warning,
        when: meeting.startsAt?.toLocaleString("en-GB") ?? null,
        room: meeting.room?.name ?? null,
      });
    }
  }

  const seen = new Set<string>();
  return conflicts.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}
