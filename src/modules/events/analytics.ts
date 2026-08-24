import type { Prisma, InvitationStatus } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { parseQuestionnaire } from "@/modules/matchmaking/score";

export type EventAnalyticsFilters = {
  categoryId?: string | null;
  country?: string | null;
  company?: string | null;
};

export type EventAnalyticsSnapshot = {
  invitations: {
    sent: number;
    delivered: number;
    opened: number;
    accepted: number;
    declined: number;
    expired: number;
    bounced: number;
    registered: number;
    conversionRate: number | null;
  };
  matchmaking: {
    profilesCompleted: number;
    matchScoresComputed: number;
    meetingRequests: number;
    meetingRequestsAccepted: number;
    meetingRequestsDeclined: number;
    aiInsightsGenerated: number;
  };
  meetings: {
    requested: number;
    accepted: number;
    scheduled: number;
    cancelled: number;
    completed: number;
    roomsTotal: number;
    roomsUsed: number;
    roomUtilizationRate: number | null;
  };
  polls: {
    published: number;
    responses: number;
  };
};

function conversionRate(numerator: number, denominator: number): number | null {
  if (denominator <= 0) return null;
  return Math.round((numerator / denominator) * 1000) / 10;
}

function hasActiveFilters(filters?: EventAnalyticsFilters): boolean {
  if (!filters) return false;
  return Boolean(filters.categoryId || filters.country || filters.company);
}

function attendeeSegmentWhere(
  organisationId: string,
  eventId: string,
  filters?: EventAnalyticsFilters,
): Prisma.AttendeeWhereInput {
  const where: Prisma.AttendeeWhereInput = { organisationId, eventId };
  if (filters?.categoryId) where.categoryId = filters.categoryId;
  if (filters?.country?.trim()) {
    where.country = { equals: filters.country.trim(), mode: "insensitive" };
  }
  if (filters?.company?.trim()) {
    where.company = { contains: filters.company.trim(), mode: "insensitive" };
  }
  return where;
}

function invitationSegmentWhere(
  organisationId: string,
  eventId: string,
  filters?: EventAnalyticsFilters,
  status?: Prisma.EnumInvitationStatusFilter | InvitationStatus,
): Prisma.InvitationWhereInput {
  const where: Prisma.InvitationWhereInput = { organisationId, eventId };
  if (status) where.status = status;
  if (filters?.categoryId) where.categoryId = filters.categoryId;
  if (filters?.country?.trim() || filters?.company?.trim()) {
    where.contact = {};
    if (filters.country?.trim()) {
      where.contact.country = { equals: filters.country.trim(), mode: "insensitive" };
    }
    if (filters.company?.trim()) {
      where.contact.company = { contains: filters.company.trim(), mode: "insensitive" };
    }
  }
  return where;
}

export async function loadEventAnalytics(
  organisationId: string,
  eventId: string,
  filters?: EventAnalyticsFilters,
): Promise<EventAnalyticsSnapshot> {
  const filtered = hasActiveFilters(filters);
  const attendeeWhere = attendeeSegmentWhere(organisationId, eventId, filters);

  const [
    sent,
    delivered,
    opened,
    accepted,
    declined,
    expired,
    bounced,
    registered,
    matchProfiles,
    matchScoresComputed,
    meetingRequests,
    meetingRequestsAccepted,
    meetingRequestsDeclined,
    aiInsightsGenerated,
    meetingsScheduled,
    meetingsCancelled,
    meetingsCompleted,
    meetingRequestsTotal,
    roomsTotal,
    roomsUsedRows,
    pollsPublished,
    pollResponses,
  ] = await Promise.all([
    prisma.invitation.count({
      where: invitationSegmentWhere(organisationId, eventId, filters, {
        notIn: ["DRAFT", "CANCELLED"],
      }),
    }),
    prisma.invitation.count({
      where: invitationSegmentWhere(organisationId, eventId, filters, "DELIVERED"),
    }),
    prisma.invitation.count({
      where: invitationSegmentWhere(organisationId, eventId, filters, "OPENED"),
    }),
    prisma.invitation.count({
      where: invitationSegmentWhere(organisationId, eventId, filters, "ACCEPTED"),
    }),
    prisma.invitation.count({
      where: invitationSegmentWhere(organisationId, eventId, filters, "DECLINED"),
    }),
    prisma.invitation.count({
      where: invitationSegmentWhere(organisationId, eventId, filters, "EXPIRED"),
    }),
    prisma.invitation.count({
      where: invitationSegmentWhere(organisationId, eventId, filters, "BOUNCED"),
    }),
    prisma.attendee.count({ where: attendeeWhere }),
    filtered
      ? prisma.matchmakingProfile.findMany({
          where: {
            organisationId,
            eventId,
            attendee: attendeeWhere,
          },
          select: { questionnaire: true },
        })
      : prisma.matchmakingProfile.findMany({
          where: { organisationId, eventId },
          select: { questionnaire: true },
        }),
    filtered
      ? prisma.matchScore.count({
          where: {
            organisationId,
            eventId,
            subject: attendeeWhere,
          },
        })
      : prisma.matchScore.count({ where: { organisationId, eventId } }),
    filtered
      ? prisma.meetingRequest.count({
          where: {
            organisationId,
            eventId,
            requester: attendeeWhere,
          },
        })
      : prisma.meetingRequest.count({ where: { organisationId, eventId } }),
    filtered
      ? prisma.meetingRequest.count({
          where: {
            organisationId,
            eventId,
            status: "ACCEPTED",
            requester: attendeeWhere,
          },
        })
      : prisma.meetingRequest.count({
          where: { organisationId, eventId, status: "ACCEPTED" },
        }),
    filtered
      ? prisma.meetingRequest.count({
          where: {
            organisationId,
            eventId,
            status: "DECLINED",
            requester: attendeeWhere,
          },
        })
      : prisma.meetingRequest.count({
          where: { organisationId, eventId, status: "DECLINED" },
        }),
    filtered
      ? prisma.matchScore.count({
          where: {
            organisationId,
            eventId,
            aiInsight: { not: null },
            subject: attendeeWhere,
          },
        })
      : prisma.matchScore.count({
          where: {
            organisationId,
            eventId,
            aiInsight: { not: null },
          },
        }),
    filtered
      ? prisma.meeting.count({
          where: {
            organisationId,
            eventId,
            status: "SCHEDULED",
            participants: { some: { attendee: attendeeWhere } },
          },
        })
      : prisma.meeting.count({
          where: { organisationId, eventId, status: "SCHEDULED" },
        }),
    filtered
      ? prisma.meeting.count({
          where: {
            organisationId,
            eventId,
            status: "CANCELLED",
            participants: { some: { attendee: attendeeWhere } },
          },
        })
      : prisma.meeting.count({
          where: { organisationId, eventId, status: "CANCELLED" },
        }),
    filtered
      ? prisma.meeting.count({
          where: {
            organisationId,
            eventId,
            status: "COMPLETED",
            participants: { some: { attendee: attendeeWhere } },
          },
        })
      : prisma.meeting.count({
          where: { organisationId, eventId, status: "COMPLETED" },
        }),
    filtered
      ? prisma.meetingRequest.count({
          where: {
            organisationId,
            eventId,
            requester: attendeeWhere,
          },
        })
      : prisma.meetingRequest.count({ where: { organisationId, eventId } }),
    prisma.meetingRoom.count({ where: { organisationId, eventId } }),
    prisma.meeting.findMany({
      where: {
        organisationId,
        eventId,
        status: { not: "CANCELLED" },
        roomId: { not: null },
      },
      select: { roomId: true },
      distinct: ["roomId"],
    }),
    prisma.eventPoll.count({
      where: { organisationId, eventId, status: "PUBLISHED" },
    }),
    filtered
      ? prisma.eventPollResponse.count({
          where: {
            organisationId,
            eventId,
            attendee: attendeeWhere,
          },
        })
      : prisma.eventPollResponse.count({ where: { organisationId, eventId } }),
  ]);

  const profilesCompleted = matchProfiles.filter((row) =>
    Boolean(parseQuestionnaire(row.questionnaire).completedAt),
  ).length;

  const roomsUsed = roomsUsedRows.length;
  const scheduledWithTime = filtered
    ? await prisma.meeting.count({
        where: {
          organisationId,
          eventId,
          status: "SCHEDULED",
          startsAt: { not: null },
          participants: { some: { attendee: attendeeWhere } },
        },
      })
    : await prisma.meeting.count({
        where: {
          organisationId,
          eventId,
          status: "SCHEDULED",
          startsAt: { not: null },
        },
      });

  return {
    invitations: {
      sent,
      delivered,
      opened,
      accepted,
      declined,
      expired,
      bounced,
      registered,
      conversionRate: conversionRate(registered, sent),
    },
    matchmaking: {
      profilesCompleted,
      matchScoresComputed,
      meetingRequests,
      meetingRequestsAccepted,
      meetingRequestsDeclined,
      aiInsightsGenerated,
    },
    meetings: {
      requested: meetingRequestsTotal,
      accepted: meetingRequestsAccepted,
      scheduled: meetingsScheduled,
      cancelled: meetingsCancelled,
      completed: meetingsCompleted,
      roomsTotal,
      roomsUsed,
      roomUtilizationRate:
        roomsTotal > 0 && scheduledWithTime > 0
          ? conversionRate(roomsUsed, roomsTotal)
          : null,
    },
    polls: {
      published: pollsPublished,
      responses: pollResponses,
    },
  };
}
