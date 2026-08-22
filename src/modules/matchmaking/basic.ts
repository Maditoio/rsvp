import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/authz/require";
import { AuthzError, forOrganisation } from "@/lib/db/tenant";
import type { Prisma } from "@prisma/client";
import { isQuestionnaireComplete } from "./questionnaire";
import {
  asStringArray,
  isMatchmakingEligible,
  isProfileVisible,
  loadAiInsightFlags,
  matchBandFromScore,
  parseMatchReasons,
  recomputeMatchScoresForAttendee,
  scoreMatch,
  toScoreableProfile,
  type MatchBand,
  type MatchReasons,
} from "./score";

export type DirectoryConnectionStatus =
  | "none"
  | "pending_sent"
  | "pending_received"
  | "connected";

export type DirectoryPerson = {
  id: string;
  firstName: string;
  lastName: string;
  company: string | null;
  jobTitle: string | null;
  country: string | null;
  email: string | null;
  phone: string | null;
  about: string | null;
  lookingFor: string | null;
  offering: string | null;
  interests: string[];
  sharedInterests: string[];
  score: number;
  reasons: MatchReasons;
  band: MatchBand | null;
  matchmakingEnabled: boolean;
  matchmakingEligible: boolean;
  connectionStatus: DirectoryConnectionStatus;
  /** Cached AI explanation when previously generated; null if none. */
  aiInsight: string | null;
};

export type RankedDirectory = {
  meId: string;
  forYou: DirectoryPerson[];
  people: DirectoryPerson[];
  eventAiEnabled: boolean;
  attendeeOptIn: boolean;
  questionnaireComplete: boolean;
  matchmakingEnabled: boolean;
};

const directoryInclude = {
  profile: true,
  privacy: true,
  category: { select: { matchmakingEligible: true as const } },
  matchProfile: true,
};

function byName(a: DirectoryPerson, b: DirectoryPerson) {
  return a.lastName.localeCompare(b.lastName) || a.firstName.localeCompare(b.firstName);
}

function forYouRank(a: DirectoryPerson, b: DirectoryPerson) {
  return b.score - a.score || byName(a, b);
}

export function connectionStatusFor(
  meId: string,
  otherId: string,
  requests: { requesterId: string; targetId: string; status: string }[],
): DirectoryConnectionStatus {
  for (const req of requests) {
    if (req.status !== "PENDING" && req.status !== "ACCEPTED") continue;
    const involves =
      (req.requesterId === meId && req.targetId === otherId) ||
      (req.requesterId === otherId && req.targetId === meId);
    if (!involves) continue;
    if (req.status === "ACCEPTED") return "connected";
    if (req.requesterId === meId) return "pending_sent";
    return "pending_received";
  }
  return "none";
}

export function shouldExcludeFromRecommendations(status: DirectoryConnectionStatus) {
  return status !== "none";
}

function toDirectoryPerson(
  row: {
    id: string;
    firstName: string;
    lastName: string;
    company: string | null;
    jobTitle: string | null;
    country: string | null;
    email: string;
    phone: string | null;
    profile: {
      about: string | null;
      lookingFor: string | null;
      offering: string | null;
      interests: Prisma.JsonValue | null;
    } | null;
    privacy: {
      showEmail: boolean;
      showPhone: boolean;
      matchmakingEnabled: boolean;
    } | null;
    category: { matchmakingEligible: boolean } | null;
    matchProfile: { questionnaire: Prisma.JsonValue } | null;
  },
  meScoreable: ReturnType<typeof toScoreableProfile>,
  storedByCandidate: Map<
    string,
    { score: number; reasons: unknown; aiInsight: string | null }
  >,
  connectionStatus: DirectoryConnectionStatus,
): DirectoryPerson {
  const storedRow = storedByCandidate.get(row.id);
  const live =
    storedRow == null
      ? scoreMatch(meScoreable, toScoreableProfile(row))
      : null;
  const score = storedRow ? storedRow.score : (live?.score ?? 0);
  const reasons = storedRow
    ? parseMatchReasons(storedRow.reasons, row.country)
    : (live?.reasons ?? parseMatchReasons(null, row.country));
  const interests = asStringArray(row.profile?.interests);

  return {
    id: row.id,
    firstName: row.firstName,
    lastName: row.lastName,
    company: row.company,
    jobTitle: row.jobTitle,
    country: row.country,
    email: row.privacy?.showEmail ? row.email : null,
    phone: row.privacy?.showPhone ? row.phone : null,
    about: row.profile?.about ?? null,
    lookingFor: row.profile?.lookingFor ?? null,
    offering: row.profile?.offering ?? null,
    interests,
    sharedInterests: reasons.sharedInterests,
    score,
    reasons,
    band: matchBandFromScore(score),
    matchmakingEnabled: row.privacy?.matchmakingEnabled === true,
    matchmakingEligible: isMatchmakingEligible(row),
    connectionStatus,
    aiInsight: storedRow?.aiInsight ?? null,
  };
}

/**
 * Ranked attendee directory. Reads persisted MatchScore rows when present;
 * otherwise scores in memory and does not write.
 */
export async function rankedDirectory(eventId: string): Promise<RankedDirectory> {
  const user = await requireUser();
  const me = await prisma.attendee.findFirst({
    where: { eventId, userId: user.id },
    include: directoryInclude,
  });
  if (!me) throw new AuthzError("You are not registered for this event", 403);

  const questionnaireComplete = isQuestionnaireComplete(
    me.matchProfile?.questionnaire,
  );
  if (questionnaireComplete) {
    const attendeeCount = await prisma.attendee.count({
      where: forOrganisation(me.organisationId, { eventId }),
    });
    if (attendeeCount <= 100) {
      await recomputeMatchScoresForAttendee(eventId, me.id);
    }
  }

  const existingRequests = await prisma.meetingRequest.findMany({
    where: {
      eventId,
      status: { in: ["PENDING", "ACCEPTED"] },
      OR: [{ requesterId: me.id }, { targetId: me.id }],
    },
    select: { requesterId: true, targetId: true, status: true },
  });

  const others = await prisma.attendee.findMany({
    where: forOrganisation(me.organisationId, {
      eventId,
      id: { not: me.id },
    }),
    include: directoryInclude,
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });

  const visible = others.filter(isProfileVisible);
  const stored =
    visible.length === 0
      ? []
      : await prisma.matchScore.findMany({
          where: forOrganisation(me.organisationId, {
            eventId,
            subjectId: me.id,
            candidateId: { in: visible.map((row) => row.id) },
          }),
        });
  const storedByCandidate = new Map(stored.map((row) => [row.candidateId, row]));
  const meScoreable = toScoreableProfile(me);

  const people: DirectoryPerson[] = visible.map((row) =>
    toDirectoryPerson(
      row,
      meScoreable,
      storedByCandidate,
      connectionStatusFor(me.id, row.id, existingRequests),
    ),
  );

  const recommendationPool = people.filter(
    (person) => !shouldExcludeFromRecommendations(person.connectionStatus),
  );
  const ranked = recommendationPool.filter(
    (person) => person.matchmakingEligible && person.band != null,
  );
  const enabledRanked = ranked.filter((person) => person.matchmakingEnabled);
  const forYou = (enabledRanked.length > 0 ? enabledRanked : ranked).sort(
    forYouRank,
  );
  const forYouIds = new Set(forYou.map((person) => person.id));
  const remaining = people.filter((person) => !forYouIds.has(person.id)).sort(byName);

  const flags = await loadAiInsightFlags(eventId, me.id);

  return {
    meId: me.id,
    forYou,
    people: remaining,
    eventAiEnabled: flags.eventAiEnabled,
    attendeeOptIn: flags.attendeeOptIn,
    questionnaireComplete,
    matchmakingEnabled: me.privacy?.matchmakingEnabled === true,
  };
}

/** Recompute stored match scores for every attendee on an event. */
export async function refreshEventMatchScores(eventId: string) {
  const user = await requireUser();
  const me = await prisma.attendee.findFirst({
    where: { eventId, userId: user.id },
    select: { id: true, organisationId: true },
  });
  if (!me) throw new AuthzError("You are not registered for this event", 403);

  const attendees = await prisma.attendee.findMany({
    where: forOrganisation(me.organisationId, { eventId }),
    select: { id: true },
  });

  for (const row of attendees) {
    await recomputeMatchScoresForAttendee(eventId, row.id);
  }

  return { attendees: attendees.length };
}
