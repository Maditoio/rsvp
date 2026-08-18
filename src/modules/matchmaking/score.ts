import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { AuthzError, forOrganisation } from "@/lib/db/tenant";

export type MatchQuestionnaire = {
  lookingFor: string[];
  offering: string[];
  industries: string[];
  geographies: string[];
  meetingPreferences: string[];
  completedAt?: string | null;
};

export type MatchReasons = {
  lookingOfferingOverlap: string[];
  offeringLookingOverlap: string[];
  sharedIndustries: string[];
  sharedGeographies: string[];
  sharedMeetingPreferences: string[];
  sharedInterests: string[];
  sameCountry: boolean;
  labels: string[];
};

export type MatchBand = "strong" | "good" | "possible";

export type ScoredMatch = {
  score: number;
  reasons: MatchReasons;
  band: MatchBand | null;
};

/** Points per overlapping term (capped). Complementarity outranks similarity. */
export const MATCH_WEIGHTS = {
  lookingOffering: 32,
  offeringLooking: 20,
  industries: 10,
  geographies: 8,
  meetingPreferences: 6,
  interests: 10,
  sameCountry: 5,
  overlapCap: 3,
  interestCap: 4,
} as const;

export const MATCH_BANDS = {
  strong: 32,
  good: 18,
  possible: 8,
} as const;

const scoringInclude = {
  profile: true,
  privacy: true,
  category: { select: { matchmakingEligible: true as const } },
  matchProfile: true,
};

type ScoringAttendee = {
  id: string;
  organisationId: string;
  eventId: string;
  firstName: string;
  lastName: string;
  company: string | null;
  jobTitle: string | null;
  country: string | null;
  email: string;
  phone: string | null;
  category: { matchmakingEligible: boolean } | null;
  profile: {
    about: string | null;
    lookingFor: string | null;
    offering: string | null;
    interests: Prisma.JsonValue | null;
  } | null;
  privacy: {
    profileVisible: boolean;
    matchmakingEnabled: boolean;
    showEmail: boolean;
    showPhone: boolean;
  } | null;
  matchProfile: { questionnaire: Prisma.JsonValue } | null;
};

export function emptyQuestionnaire(): MatchQuestionnaire {
  return {
    lookingFor: [],
    offering: [],
    industries: [],
    geographies: [],
    meetingPreferences: [],
    completedAt: null,
  };
}

export function emptyReasons(): MatchReasons {
  return {
    lookingOfferingOverlap: [],
    offeringLookingOverlap: [],
    sharedIndustries: [],
    sharedGeographies: [],
    sharedMeetingPreferences: [],
    sharedInterests: [],
    sameCountry: false,
    labels: [],
  };
}

export function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function normalizeTerm(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function uniqueTerms(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of values) {
    const key = normalizeTerm(raw);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(raw.trim());
  }
  return out;
}

function indexedTerms(values: string[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const raw of uniqueTerms(values)) {
    map.set(normalizeTerm(raw), raw);
  }
  return map;
}

export function overlapTerms(left: string[], right: string[]): string[] {
  const rightIndex = indexedTerms(right);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of uniqueTerms(left)) {
    const key = normalizeTerm(raw);
    const match = rightIndex.get(key);
    if (!key || seen.has(key) || !match) continue;
    seen.add(key);
    out.push(match);
  }
  return out;
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function parseQuestionnaire(value: unknown): MatchQuestionnaire {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return emptyQuestionnaire();
  }
  const row = value as Record<string, unknown>;
  return {
    lookingFor: uniqueTerms(asStringArray(row.lookingFor)),
    offering: uniqueTerms(asStringArray(row.offering)),
    industries: uniqueTerms(asStringArray(row.industries)),
    geographies: uniqueTerms(asStringArray(row.geographies)),
    meetingPreferences: uniqueTerms(asStringArray(row.meetingPreferences)),
    completedAt: readString(row.completedAt),
  };
}

export function questionnaireIsEmpty(q: MatchQuestionnaire) {
  return (
    q.lookingFor.length === 0 &&
    q.offering.length === 0 &&
    q.industries.length === 0 &&
    q.geographies.length === 0 &&
    q.meetingPreferences.length === 0
  );
}

function joinTerms(items: string[]): string {
  const shown = items.slice(0, 3);
  if (shown.length === 0) return "";
  if (shown.length === 1) return shown[0];
  if (shown.length === 2) return `${shown[0]} and ${shown[1]}`;
  return `${shown[0]}, ${shown[1]}, and ${shown[2]}`;
}

export function buildMatchLabels(
  reasons: Omit<MatchReasons, "labels">,
  country?: string | null,
): string[] {
  const labels: string[] = [];
  if (reasons.lookingOfferingOverlap.length > 0) {
    labels.push(
      `They offer ${joinTerms(reasons.lookingOfferingOverlap)} — complementary to what you are looking for`,
    );
  }
  if (reasons.offeringLookingOverlap.length > 0) {
    labels.push(
      `You offer ${joinTerms(reasons.offeringLookingOverlap)} they are seeking`,
    );
  }
  if (reasons.sharedIndustries.length > 0) {
    labels.push(`You both work in ${joinTerms(reasons.sharedIndustries)}`);
  }
  if (reasons.sharedGeographies.length > 0) {
    labels.push(`You both focus on ${joinTerms(reasons.sharedGeographies)}`);
  }
  if (reasons.sharedMeetingPreferences.length > 0) {
    labels.push(
      `You both prefer meetings with ${joinTerms(reasons.sharedMeetingPreferences)}`,
    );
  }
  if (reasons.sharedInterests.length > 0) {
    labels.push(`Shared interests: ${joinTerms(reasons.sharedInterests)}`);
  }
  if (reasons.sameCountry) {
    const place = country?.trim();
    labels.push(place ? `You are both based in ${place}` : "You are based in the same country");
  }
  return labels;
}

export function parseMatchReasons(
  value: unknown,
  country?: string | null,
): MatchReasons {
  const base = emptyReasons();
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return base;
  }
  const row = value as Record<string, unknown>;
  const withoutLabels = {
    lookingOfferingOverlap: uniqueTerms(asStringArray(row.lookingOfferingOverlap)),
    offeringLookingOverlap: uniqueTerms(asStringArray(row.offeringLookingOverlap)),
    sharedIndustries: uniqueTerms(asStringArray(row.sharedIndustries)),
    sharedGeographies: uniqueTerms(asStringArray(row.sharedGeographies)),
    sharedMeetingPreferences: uniqueTerms(
      asStringArray(row.sharedMeetingPreferences),
    ),
    sharedInterests: uniqueTerms(asStringArray(row.sharedInterests)),
    sameCountry: row.sameCountry === true,
  };
  const labels = asStringArray(row.labels);
  return {
    ...withoutLabels,
    labels:
      labels.length > 0 ? labels : buildMatchLabels(withoutLabels, country),
  };
}

export function matchBandFromScore(score: number): MatchBand | null {
  if (score >= MATCH_BANDS.strong) return "strong";
  if (score >= MATCH_BANDS.good) return "good";
  if (score >= MATCH_BANDS.possible) return "possible";
  return null;
}

export function matchBandLabel(band: MatchBand | null): string | null {
  if (band === "strong") return "Strong match";
  if (band === "good") return "Good match";
  if (band === "possible") return "Possible match";
  return null;
}

function cappedCount(count: number, cap: number) {
  return Math.min(count, cap);
}

export type ScoreableProfile = {
  country: string | null;
  interests: string[];
  questionnaire: MatchQuestionnaire;
};

export function toScoreableProfile(person: {
  country: string | null;
  profile?: { interests: Prisma.JsonValue | null } | null;
  matchProfile?: { questionnaire: Prisma.JsonValue } | null;
}): ScoreableProfile {
  return {
    country: person.country,
    interests: asStringArray(person.profile?.interests),
    questionnaire: parseQuestionnaire(person.matchProfile?.questionnaire),
  };
}

export function scoreMatch(
  subject: ScoreableProfile,
  candidate: ScoreableProfile,
): ScoredMatch {
  const mine = subject.questionnaire;
  const theirs = candidate.questionnaire;

  const lookingOfferingOverlap = overlapTerms(mine.lookingFor, theirs.offering);
  const offeringLookingOverlap = overlapTerms(mine.offering, theirs.lookingFor);
  const sharedIndustries = overlapTerms(mine.industries, theirs.industries);
  const sharedGeographies = overlapTerms(mine.geographies, theirs.geographies);
  const sharedMeetingPreferences = overlapTerms(
    mine.meetingPreferences,
    theirs.meetingPreferences,
  );
  const sharedInterests = overlapTerms(subject.interests, candidate.interests);
  const sameCountry = Boolean(
    subject.country &&
      candidate.country &&
      normalizeTerm(subject.country) === normalizeTerm(candidate.country),
  );

  const cap = MATCH_WEIGHTS.overlapCap;
  let score =
    cappedCount(lookingOfferingOverlap.length, cap) *
      MATCH_WEIGHTS.lookingOffering +
    cappedCount(offeringLookingOverlap.length, cap) *
      MATCH_WEIGHTS.offeringLooking +
    cappedCount(sharedIndustries.length, cap) * MATCH_WEIGHTS.industries +
    cappedCount(sharedGeographies.length, cap) * MATCH_WEIGHTS.geographies +
    cappedCount(sharedMeetingPreferences.length, cap) *
      MATCH_WEIGHTS.meetingPreferences;

  // Phase 2 interests + country when the questionnaire is empty; light bonus otherwise.
  if (questionnaireIsEmpty(mine)) {
    score +=
      cappedCount(sharedInterests.length, MATCH_WEIGHTS.interestCap) *
      MATCH_WEIGHTS.interests;
    if (sameCountry) score += MATCH_WEIGHTS.sameCountry;
  } else {
    score += cappedCount(sharedInterests.length, 2) * 4;
    if (sameCountry) score += 3;
  }

  const withoutLabels = {
    lookingOfferingOverlap,
    offeringLookingOverlap,
    sharedIndustries,
    sharedGeographies,
    sharedMeetingPreferences,
    sharedInterests,
    sameCountry,
  };
  const reasons: MatchReasons = {
    ...withoutLabels,
    labels: buildMatchLabels(withoutLabels, candidate.country),
  };

  return {
    score,
    reasons,
    band: matchBandFromScore(score),
  };
}

export function isProfileVisible(person: {
  privacy: { profileVisible: boolean } | null;
}) {
  return person.privacy == null || person.privacy.profileVisible;
}

export function isMatchmakingEligible(person: {
  category: { matchmakingEligible: boolean } | null;
}) {
  if (person.category == null) return true;
  return person.category.matchmakingEligible !== false;
}

export function isMatchCandidate(person: {
  privacy: { profileVisible: boolean } | null;
  category: { matchmakingEligible: boolean } | null;
}) {
  return isProfileVisible(person) && isMatchmakingEligible(person);
}

function reasonsJson(reasons: MatchReasons): Prisma.InputJsonValue {
  return {
    lookingOfferingOverlap: reasons.lookingOfferingOverlap,
    offeringLookingOverlap: reasons.offeringLookingOverlap,
    sharedIndustries: reasons.sharedIndustries,
    sharedGeographies: reasons.sharedGeographies,
    sharedMeetingPreferences: reasons.sharedMeetingPreferences,
    sharedInterests: reasons.sharedInterests,
    sameCountry: reasons.sameCountry,
    labels: reasons.labels,
  };
}

export async function loadAiInsightFlags(
  eventId: string,
  attendeeId: string,
): Promise<{ eventAiEnabled: boolean; attendeeOptIn: boolean }> {
  let eventAiEnabled = false;
  let attendeeOptIn = false;
  try {
    const settings = await prisma.eventSettings.findUnique({
      where: { eventId },
      select: { aiInsightsEnabled: true },
    });
    eventAiEnabled = settings?.aiInsightsEnabled === true;
  } catch {
    eventAiEnabled = false;
  }
  try {
    const privacy = await prisma.attendeePrivacy.findUnique({
      where: { attendeeId },
      select: { aiInsightsOptIn: true },
    });
    attendeeOptIn = privacy?.aiInsightsOptIn === true;
  } catch {
    attendeeOptIn = false;
  }
  return { eventAiEnabled, attendeeOptIn };
}

async function loadScoringAttendee(eventId: string, attendeeId: string) {
  const attendee = await prisma.attendee.findFirst({
    where: { id: attendeeId, eventId },
    include: scoringInclude,
  });
  if (!attendee) {
    throw new AuthzError("Attendee not found for this event", 404);
  }
  return attendee as ScoringAttendee;
}

async function loadEventAttendees(eventId: string, organisationId: string) {
  const rows = await prisma.attendee.findMany({
    where: forOrganisation(organisationId, { eventId }),
    include: scoringInclude,
  });
  return rows as ScoringAttendee[];
}

type ScoreRow = {
  organisationId: string;
  eventId: string;
  subjectId: string;
  candidateId: string;
  score: number;
  reasons: MatchReasons;
};

async function persistScoreRows(rows: ScoreRow[], staleWhere: Prisma.MatchScoreWhereInput) {
  await prisma.matchScore.deleteMany({ where: staleWhere });
  const chunkSize = 80;
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    await prisma.$transaction(
      chunk.map((row) =>
        prisma.matchScore.upsert({
          where: {
            subjectId_candidateId: {
              subjectId: row.subjectId,
              candidateId: row.candidateId,
            },
          },
          create: {
            organisationId: row.organisationId,
            eventId: row.eventId,
            subjectId: row.subjectId,
            candidateId: row.candidateId,
            score: row.score,
            reasons: reasonsJson(row.reasons),
          },
          update: {
            score: row.score,
            reasons: reasonsJson(row.reasons),
          },
        }),
      ),
    );
  }
}

function pairScore(subject: ScoringAttendee, candidate: ScoringAttendee): ScoreRow {
  const result = scoreMatch(toScoreableProfile(subject), toScoreableProfile(candidate));
  return {
    organisationId: subject.organisationId,
    eventId: subject.eventId,
    subjectId: subject.id,
    candidateId: candidate.id,
    score: result.score,
    reasons: result.reasons,
  };
}

/**
 * Persist complementarity scores for one attendee (both directions).
 * Slice 1 should call this after questionnaire save. Directory views must not.
 */
export async function recomputeMatchScoresForAttendee(
  eventId: string,
  attendeeId: string,
) {
  const subject = await loadScoringAttendee(eventId, attendeeId);
  const everyone = await loadEventAttendees(eventId, subject.organisationId);
  const others = everyone.filter((row) => row.id !== subject.id);
  const eligibleOthers = others.filter(isMatchCandidate);
  const subjectCanBeCandidate = isMatchCandidate(subject);

  const outbound = isMatchmakingEligible(subject)
    ? eligibleOthers.map((candidate) => pairScore(subject, candidate))
    : [];
  const inbound = subjectCanBeCandidate
    ? others
        .filter(isMatchmakingEligible)
        .map((other) => pairScore(other, subject))
    : [];

  await persistScoreRows(outbound, {
    organisationId: subject.organisationId,
    eventId,
    subjectId: subject.id,
  });
  await persistScoreRows(inbound, {
    organisationId: subject.organisationId,
    eventId,
    candidateId: subject.id,
    subjectId: { not: subject.id },
  });

  return { outbound: outbound.length, inbound: inbound.length };
}

export async function recomputeMatchScoresForEvent(eventId: string) {
  const sample = await prisma.attendee.findFirst({
    where: { eventId },
    select: { organisationId: true },
  });
  if (!sample) return { attendees: 0, pairs: 0 };

  const everyone = await loadEventAttendees(eventId, sample.organisationId);
  const rows: ScoreRow[] = [];
  for (const subject of everyone) {
    if (!isMatchmakingEligible(subject)) continue;
    for (const candidate of everyone) {
      if (candidate.id === subject.id) continue;
      if (!isMatchCandidate(candidate)) continue;
      rows.push(pairScore(subject, candidate));
    }
  }

  await persistScoreRows(rows, {
    organisationId: sample.organisationId,
    eventId,
  });
  return { attendees: everyone.length, pairs: rows.length };
}
