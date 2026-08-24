import { prisma } from "@/lib/db/prisma";

export type MeetingCalendarStatus = {
  meetingId: string;
  synced: number;
  expected: number;
  warnings: string[];
  status: "synced" | "partial" | "none" | "not_applicable";
};

export async function loadMeetingCalendarStatuses(
  organisationId: string,
  eventId: string,
  meetingIds: string[],
): Promise<Map<string, MeetingCalendarStatus>> {
  const result = new Map<string, MeetingCalendarStatus>();
  if (meetingIds.length === 0) return result;

  const meetings = await prisma.meeting.findMany({
    where: {
      id: { in: meetingIds },
      eventId,
      organisationId,
    },
    include: {
      participants: {
        include: {
          attendee: { select: { userId: true, firstName: true, lastName: true } },
        },
      },
      calendarEvents: {
        include: {
          connection: {
            include: { user: { select: { firstName: true, lastName: true, email: true } } },
          },
        },
      },
    },
  });

  for (const meeting of meetings) {
    if (!meeting.startsAt || !meeting.endsAt) {
      result.set(meeting.id, {
        meetingId: meeting.id,
        synced: 0,
        expected: 0,
        warnings: [],
        status: "not_applicable",
      });
      continue;
    }

    const linkedParticipants = meeting.participants.filter((p) => p.attendee.userId);
    const expectedConnections = await prisma.calendarConnection.count({
      where: {
        userId: {
          in: linkedParticipants
            .map((p) => p.attendee.userId)
            .filter((id): id is string => id != null),
        },
        provider: { in: ["google", "microsoft"] },
      },
    });

    const synced = meeting.calendarEvents.filter((row) => row.externalId).length;
    const warnings: string[] = [];

    for (const participant of meeting.participants) {
      if (!participant.attendee.userId) {
        warnings.push(
          `${participant.attendee.firstName} ${participant.attendee.lastName} has no linked account for calendar sync.`,
        );
      }
    }

    for (const participant of linkedParticipants) {
      const userId = participant.attendee.userId!;
      const hasConnection = meeting.calendarEvents.some(
        (row) => row.connection.userId === userId && row.externalId,
      );
      if (!hasConnection) {
        const connCount = await prisma.calendarConnection.count({
          where: { userId, provider: { in: ["google", "microsoft"] } },
        });
        if (connCount === 0) {
          warnings.push(
            `${participant.attendee.firstName} ${participant.attendee.lastName} has not connected a calendar.`,
          );
        } else {
          warnings.push(
            `${participant.attendee.firstName} ${participant.attendee.lastName}: calendar sync pending or failed.`,
          );
        }
      }
    }

    let status: MeetingCalendarStatus["status"] = "none";
    if (expectedConnections === 0) {
      status = linkedParticipants.length === 0 ? "not_applicable" : "none";
    } else if (synced >= expectedConnections) {
      status = "synced";
    } else if (synced > 0) {
      status = "partial";
    }

    result.set(meeting.id, {
      meetingId: meeting.id,
      synced,
      expected: expectedConnections,
      warnings,
      status,
    });
  }

  return result;
}
