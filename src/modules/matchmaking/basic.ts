import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/authz/require";
import { AuthzError, forOrganisation } from "@/lib/db/tenant";
import {
  asStringArray,
  isMatchmakingEligible,
  isProfileVisible,
  loadAiInsightFlags,
  matchBandFromScore,
  parseMatchReasons,
  scoreMatch,
  toScoreableProfile,
  type MatchBand,
  type MatchReasons,
} from "./score";

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
};

export type RankedDirectory = {
  meId: string;
  forYou: DirectoryPerson[];
  people: DirectoryPerson[];
  eventAiEnabled: boolean;
  attendeeOptIn: boolean;
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

  const people: DirectoryPerson[] = visible.map((row) => {
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
    };
  });

  const ranked = people.filter(
    (person) => person.matchmakingEligible && person.band != null,
  );
  const enabledRanked = ranked.filter((person) => person.matchmakingEnabled);
  const forYou = (enabledRanked.length > 0 ? enabledRanked : ranked).sort(forYouRank);
  const forYouIds = new Set(forYou.map((person) => person.id));
  const remaining = people.filter((person) => !forYouIds.has(person.id)).sort(byName);

  const flags = await loadAiInsightFlags(eventId, me.id);

  return {
    meId: me.id,
    forYou,
    people: remaining,
    eventAiEnabled: flags.eventAiEnabled,
    attendeeOptIn: flags.attendeeOptIn,
  };
}
