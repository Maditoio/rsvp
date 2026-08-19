import { prisma } from "@/lib/db/prisma";

export async function eventCounts(organisationId: string, eventId: string) {
  const [
    invited,
    accepted,
    declined,
    pending,
    registered,
    confirmed,
    checkedIn,
    matchmakingEnabled,
    meetingsScheduled,
    meetingRequestsPending,
  ] = await Promise.all([
    prisma.invitation.count({
      where: {
        organisationId,
        eventId,
        status: { notIn: ["DRAFT", "CANCELLED"] },
      },
    }),
    prisma.invitation.count({
      where: { organisationId, eventId, status: "ACCEPTED" },
    }),
    prisma.invitation.count({
      where: { organisationId, eventId, status: "DECLINED" },
    }),
    prisma.invitation.count({
      where: {
        organisationId,
        eventId,
        status: { in: ["SENT", "DELIVERED", "OPENED", "SCHEDULED"] },
      },
    }),
    prisma.attendee.count({ where: { organisationId, eventId } }),
    prisma.attendee.count({
      where: { organisationId, eventId, status: "CONFIRMED" },
    }),
    prisma.checkIn.count({ where: { organisationId, eventId } }),
    prisma.matchmakingProfile.count({ where: { organisationId, eventId } }),
    prisma.meeting.count({
      where: { organisationId, eventId, status: "SCHEDULED" },
    }),
    prisma.meetingRequest.count({
      where: { organisationId, eventId, status: "PENDING" },
    }),
  ]);

  return {
    invited,
    accepted,
    declined,
    pending,
    registered,
    confirmed,
    checkedIn,
    matchmakingEnabled,
    meetingsScheduled,
    meetingRequestsPending,
  };
}
