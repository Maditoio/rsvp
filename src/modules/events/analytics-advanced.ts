import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { parseQuestionnaire } from "@/modules/matchmaking/score";
import { displayName } from "@/lib/utils";
import type { EventAnalyticsFilters } from "./analytics";

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

export type FunnelStage = {
  stage: string;
  count: number;
  rateFromSent: number | null;
};

export type RoomTimelineHour = {
  hour: number;
  label: string;
  usedRooms: number;
  totalRooms: number;
  utilizationPct: number | null;
};

export type MeetingOutcomeTrend = {
  period: string;
  accepted: number;
  declined: number;
  cancelled: number;
  noShow: number;
  completed: number;
};

export type MatchmakingRoi = {
  profilesCompleted: number;
  meetingRequests: number;
  requestsAccepted: number;
  scheduled: number;
  completed: number;
  profileToRequestPct: number | null;
  requestToScheduledPct: number | null;
  scheduledToCompletedPct: number | null;
};

export type CategoryMixRow = {
  categoryId: string | null;
  categoryName: string;
  meetingCount: number;
  attendeeCount: number;
};

export type GapAttendee = {
  id: string;
  name: string;
  company: string | null;
  category: string | null;
  completedAt: string | null;
};

function pct(n: number, d: number): number | null {
  if (d <= 0) return null;
  return Math.round((n / d) * 1000) / 10;
}

export async function loadFunnelDrillDown(
  organisationId: string,
  eventId: string,
  filters?: EventAnalyticsFilters,
): Promise<FunnelStage[]> {
  const attendeeWhere = attendeeSegmentWhere(organisationId, eventId, filters);

  const [sent, accepted, registered, profilesCompleted, withMeetings, checkedIn] =
    await Promise.all([
      prisma.invitation.count({
        where: {
          organisationId,
          eventId,
          status: { notIn: ["DRAFT", "CANCELLED"] },
          ...(filters?.categoryId ? { categoryId: filters.categoryId } : {}),
        },
      }),
      prisma.invitation.count({
        where: { organisationId, eventId, status: "ACCEPTED" },
      }),
      prisma.attendee.count({ where: attendeeWhere }),
      prisma.matchmakingProfile.findMany({
        where: { organisationId, eventId, attendee: attendeeWhere },
        select: { questionnaire: true },
      }),
      prisma.meeting.count({
        where: {
          organisationId,
          eventId,
          status: { in: ["SCHEDULED", "COMPLETED"] },
          startsAt: { not: null },
          participants: { some: { attendee: attendeeWhere } },
        },
      }),
      prisma.attendee.count({
        where: { ...attendeeWhere, status: "CHECKED_IN" },
      }),
    ]);

  const completedProfiles = profilesCompleted.filter((row) =>
    Boolean(parseQuestionnaire(row.questionnaire).completedAt),
  ).length;

  const stages: FunnelStage[] = [
    { stage: "Invited (sent)", count: sent, rateFromSent: sent > 0 ? 100 : null },
    { stage: "Accepted invitation", count: accepted, rateFromSent: pct(accepted, sent) },
    { stage: "Registered", count: registered, rateFromSent: pct(registered, sent) },
    {
      stage: "Matchmaking profile complete",
      count: completedProfiles,
      rateFromSent: pct(completedProfiles, sent),
    },
    {
      stage: "Meeting scheduled",
      count: withMeetings,
      rateFromSent: pct(withMeetings, sent),
    },
    { stage: "Checked in", count: checkedIn, rateFromSent: pct(checkedIn, sent) },
  ];

  return stages;
}

export async function loadRoomUtilizationTimeline(
  organisationId: string,
  eventId: string,
): Promise<RoomTimelineHour[]> {
  const [roomsTotal, meetings, settings] = await Promise.all([
    prisma.meetingRoom.count({ where: { organisationId, eventId } }),
    prisma.meeting.findMany({
      where: {
        organisationId,
        eventId,
        status: { not: "CANCELLED" },
        startsAt: { not: null },
        roomId: { not: null },
      },
      select: { startsAt: true },
    }),
    prisma.eventSettings.findUnique({
      where: { eventId },
      select: { eventStartTime: true, eventEndTime: true },
    }),
  ]);

  const startHour = settings?.eventStartTime
    ? Number(settings.eventStartTime.split(":")[0])
    : 9;
  const endHour = settings?.eventEndTime
    ? Number(settings.eventEndTime.split(":")[0])
    : 18;

  const hours: RoomTimelineHour[] = [];
  for (let hour = startHour; hour <= endHour; hour++) {
    const usedRooms = new Set<string>();
    for (const m of meetings) {
      if (!m.startsAt) continue;
      if (m.startsAt.getHours() === hour) {
        usedRooms.add(m.startsAt.toISOString());
      }
    }
    const usedCount = meetings.filter((m) => m.startsAt?.getHours() === hour).length;
    hours.push({
      hour,
      label: `${String(hour).padStart(2, "0")}:00`,
      usedRooms: usedCount,
      totalRooms: roomsTotal,
      utilizationPct:
        roomsTotal > 0 ? pct(Math.min(usedCount, roomsTotal), roomsTotal) : null,
    });
  }

  return hours;
}

export async function loadMeetingOutcomeTrends(
  organisationId: string,
  eventId: string,
): Promise<MeetingOutcomeTrend[]> {
  const [requests, meetings] = await Promise.all([
    prisma.meetingRequest.findMany({
      where: { organisationId, eventId },
      select: { status: true, updatedAt: true },
    }),
    prisma.meeting.findMany({
      where: { organisationId, eventId },
      select: { status: true, startsAt: true },
    }),
  ]);

  const buckets = new Map<string, MeetingOutcomeTrend>();

  function bucketKey(date: Date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
  }

  function ensure(key: string): MeetingOutcomeTrend {
    const existing = buckets.get(key);
    if (existing) return existing;
    const row: MeetingOutcomeTrend = {
      period: key,
      accepted: 0,
      declined: 0,
      cancelled: 0,
      noShow: 0,
      completed: 0,
    };
    buckets.set(key, row);
    return row;
  }

  for (const r of requests) {
    const key = bucketKey(r.updatedAt);
    const row = ensure(key);
    if (r.status === "ACCEPTED") row.accepted += 1;
    if (r.status === "DECLINED") row.declined += 1;
  }

  for (const m of meetings) {
    const key = m.startsAt
      ? bucketKey(m.startsAt)
      : "unknown";
    const row = ensure(key);
    if (m.status === "CANCELLED") row.cancelled += 1;
    if (m.status === "NO_SHOW") row.noShow += 1;
    if (m.status === "COMPLETED") row.completed += 1;
  }

  return [...buckets.values()].sort((a, b) => a.period.localeCompare(b.period));
}

export async function loadMatchmakingRoi(
  organisationId: string,
  eventId: string,
  filters?: EventAnalyticsFilters,
): Promise<MatchmakingRoi> {
  const attendeeWhere = attendeeSegmentWhere(organisationId, eventId, filters);

  const [profiles, requests, accepted, scheduled, completed] = await Promise.all([
    prisma.matchmakingProfile.findMany({
      where: { organisationId, eventId, attendee: attendeeWhere },
      select: { questionnaire: true },
    }),
    prisma.meetingRequest.count({
      where: { organisationId, eventId, requester: attendeeWhere },
    }),
    prisma.meetingRequest.count({
      where: { organisationId, eventId, status: "ACCEPTED", requester: attendeeWhere },
    }),
    prisma.meeting.count({
      where: {
        organisationId,
        eventId,
        status: { in: ["SCHEDULED", "COMPLETED"] },
        startsAt: { not: null },
        participants: { some: { attendee: attendeeWhere } },
      },
    }),
    prisma.meeting.count({
      where: {
        organisationId,
        eventId,
        status: "COMPLETED",
        participants: { some: { attendee: attendeeWhere } },
      },
    }),
  ]);

  const profilesCompleted = profiles.filter((row) =>
    Boolean(parseQuestionnaire(row.questionnaire).completedAt),
  ).length;

  return {
    profilesCompleted,
    meetingRequests: requests,
    requestsAccepted: accepted,
    scheduled,
    completed,
    profileToRequestPct: pct(requests, profilesCompleted),
    requestToScheduledPct: pct(scheduled, requests),
    scheduledToCompletedPct: pct(completed, scheduled),
  };
}

export async function loadCategoryMixReport(
  organisationId: string,
  eventId: string,
): Promise<CategoryMixRow[]> {
  const categories = await prisma.invitationCategory.findMany({
    where: { organisationId, eventId },
    select: { id: true, name: true },
  });

  const attendeeCounts = await prisma.attendee.groupBy({
    by: ["categoryId"],
    where: { organisationId, eventId },
    _count: { _all: true },
  });

  const meetingRows = await prisma.meetingParticipant.findMany({
    where: { organisationId, eventId, meeting: { status: { not: "CANCELLED" } } },
    include: { attendee: { select: { categoryId: true } } },
  });

  const meetingByCategory = new Map<string | null, number>();
  for (const row of meetingRows) {
    const cat = row.attendee.categoryId;
    meetingByCategory.set(cat, (meetingByCategory.get(cat) ?? 0) + 1);
  }

  const attendeeMap = new Map(attendeeCounts.map((r) => [r.categoryId, r._count._all]));

  const rows: CategoryMixRow[] = categories.map((cat) => ({
    categoryId: cat.id,
    categoryName: cat.name,
    meetingCount: Math.floor((meetingByCategory.get(cat.id) ?? 0) / 2),
    attendeeCount: attendeeMap.get(cat.id) ?? 0,
  }));

  const uncategorizedMeetings = Math.floor((meetingByCategory.get(null) ?? 0) / 2);
  if ((attendeeMap.get(null) ?? 0) > 0 || uncategorizedMeetings > 0) {
    rows.push({
      categoryId: null,
      categoryName: "Uncategorized",
      meetingCount: uncategorizedMeetings,
      attendeeCount: attendeeMap.get(null) ?? 0,
    });
  }

  return rows.sort((a, b) => b.meetingCount - a.meetingCount);
}

export async function loadGapFinderAttendees(
  organisationId: string,
  eventId: string,
): Promise<GapAttendee[]> {
  const profiles = await prisma.matchmakingProfile.findMany({
    where: { organisationId, eventId },
    include: {
      attendee: {
        include: {
          category: { select: { name: true } },
          meetingReqsFrom: { select: { id: true } },
          meetingReqsTo: { select: { id: true } },
          meetingParts: {
            where: { meeting: { status: { not: "CANCELLED" } } },
            select: { id: true },
          },
        },
      },
    },
  });

  return profiles
    .filter((row) => {
      const q = parseQuestionnaire(row.questionnaire);
      if (!q.completedAt) return false;
      const a = row.attendee;
      const hasActivity =
        a.meetingReqsFrom.length > 0 ||
        a.meetingReqsTo.length > 0 ||
        a.meetingParts.length > 0;
      return !hasActivity;
    })
    .map((row) => ({
      id: row.attendeeId,
      name: displayName(row.attendee),
      company: row.attendee.company,
      category: row.attendee.category?.name ?? null,
      completedAt: parseQuestionnaire(row.questionnaire).completedAt ?? null,
    }))
    .sort((a, b) => (a.name > b.name ? 1 : -1));
}

export async function loadTodaysMeetings(
  organisationId: string,
  eventId: string,
  timeZone = "UTC",
) {
  const now = new Date();
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 59, 999);

  const meetings = await prisma.meeting.findMany({
    where: {
      organisationId,
      eventId,
      status: { in: ["SCHEDULED", "COMPLETED", "NO_SHOW"] },
      startsAt: { gte: startOfDay, lte: endOfDay },
    },
    include: {
      room: { select: { name: true } },
      participants: {
        include: {
          attendee: {
            select: {
              firstName: true,
              lastName: true,
              status: true,
              company: true,
            },
          },
        },
      },
    },
    orderBy: { startsAt: "asc" },
  });

  return meetings.map((m) => ({
    id: m.id,
    status: m.status,
    startsAt: m.startsAt?.toISOString() ?? "",
    when: m.startsAt?.toLocaleString("en-GB", { timeZone }) ?? "",
    room: m.room?.name ?? null,
    participants: m.participants.map((p) => ({
      name: displayName(p.attendee),
      company: p.attendee.company,
      checkInStatus: p.attendee.status,
    })),
  }));
}
