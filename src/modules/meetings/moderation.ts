import { prisma } from "@/lib/db/prisma";
import { displayName } from "@/lib/utils";

export type ModerationRequestRow = {
  id: string;
  requesterName: string;
  requesterCompany: string | null;
  requesterCategory: string | null;
  targetName: string;
  targetCompany: string | null;
  targetCategory: string | null;
  message: string | null;
  createdAt: string;
  awaitingModeration: boolean;
};

export type AttendeeLimitRow = {
  attendeeId: string;
  name: string;
  company: string | null;
  pendingRequests: number;
  dailyRequests: number;
  atPendingLimit: boolean;
  atDailyLimit: boolean;
  matchmakingPaused: boolean;
};

const PENDING_LIMIT = 20;
const DAILY_LIMIT = 50;

export async function loadModerationQueue(
  organisationId: string,
  eventId: string,
): Promise<ModerationRequestRow[]> {
  const requests = await prisma.meetingRequest.findMany({
    where: {
      organisationId,
      eventId,
      status: "PENDING",
    },
    include: {
      requester: {
        include: { category: { select: { name: true } } },
      },
      target: {
        include: { category: { select: { name: true } } },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  return requests.map((row) => ({
    id: row.id,
    requesterName: displayName(row.requester),
    requesterCompany: row.requester.company,
    requesterCategory: row.requester.category?.name ?? null,
    targetName: displayName(row.target),
    targetCompany: row.target.company,
    targetCategory: row.target.category?.name ?? null,
    message: row.message,
    createdAt: row.createdAt.toISOString(),
    awaitingModeration: true,
  }));
}

export async function loadAttendeeRequestLimits(
  organisationId: string,
  eventId: string,
): Promise<AttendeeLimitRow[]> {
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const [attendees, pendingCounts, dailyCounts] = await Promise.all([
    prisma.attendee.findMany({
      where: { organisationId, eventId },
      include: { privacy: { select: { matchmakingPaused: true } } },
      orderBy: { lastName: "asc" },
    }),
    prisma.meetingRequest.groupBy({
      by: ["requesterId"],
      where: { organisationId, eventId, status: "PENDING" },
      _count: { _all: true },
    }),
    prisma.meetingRequest.groupBy({
      by: ["requesterId"],
      where: { organisationId, eventId, createdAt: { gte: oneDayAgo } },
      _count: { _all: true },
    }),
  ]);

  const pendingMap = new Map(pendingCounts.map((r) => [r.requesterId, r._count._all]));
  const dailyMap = new Map(dailyCounts.map((r) => [r.requesterId, r._count._all]));

  return attendees
    .map((a) => {
      const pending = pendingMap.get(a.id) ?? 0;
      const daily = dailyMap.get(a.id) ?? 0;
      return {
        attendeeId: a.id,
        name: displayName(a),
        company: a.company,
        pendingRequests: pending,
        dailyRequests: daily,
        atPendingLimit: pending >= PENDING_LIMIT,
        atDailyLimit: daily >= DAILY_LIMIT,
        matchmakingPaused: a.privacy?.matchmakingPaused === true,
      };
    })
    .filter((row) => row.pendingRequests > 0 || row.atDailyLimit || row.matchmakingPaused)
    .sort((a, b) => b.pendingRequests - a.pendingRequests);
}
