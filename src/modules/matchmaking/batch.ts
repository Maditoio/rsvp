import { prisma } from "@/lib/db/prisma";
import { forOrganisation } from "@/lib/db/tenant";
import { rateLimit } from "@/lib/rate-limit";
import { writeAudit } from "@/modules/audit/log";
import { generateMatchInsight } from "./ai-insights";
import { generateAiRankings } from "./ai-rank";
import {
  asStringArray,
  isMatchCandidate,
  isMatchmakingEligible,
  loadAiInsightFlags,
  matchBandFromScore,
  parseMatchReasons,
  parseQuestionnaire,
  recomputeMatchScoresForAttendee,
  recomputeMatchScoresForEvent,
} from "./score";

const TOP_CANDIDATES = 10;
const BATCH_AI_LIMIT_PER_SUBJECT = 5;

export type BatchPipelineResult = {
  scoresRecomputed: number;
  aiRanked: number;
  aiInsights: number;
  skipped: number;
  errors: string[];
};

function profileSummary(attendee: {
  profile: { interests: unknown; lookingFor: string | null; offering: string | null } | null;
  matchProfile: { questionnaire: unknown } | null;
}) {
  const q = parseQuestionnaire(attendee.matchProfile?.questionnaire);
  return {
    looking_for: q.lookingFor,
    offering: q.offering,
    industries: q.industries,
    geographies: q.geographies,
    interests: asStringArray(attendee.profile?.interests),
  };
}

export async function batchGenerateAiForSubject(
  eventId: string,
  subjectId: string,
  organisationId: string,
): Promise<{ ranked: number; insights: number; error?: string }> {
  const flags = await loadAiInsightFlags(eventId, subjectId);
  if (!flags.eventAiEnabled) {
    return { ranked: 0, insights: 0 };
  }

  const subject = await prisma.attendee.findFirst({
    where: { id: subjectId, eventId, organisationId },
    include: {
      profile: true,
      matchProfile: true,
      privacy: true,
      category: { select: { matchmakingEligible: true } },
    },
  });
  if (!subject || !isMatchmakingEligible(subject)) {
    return { ranked: 0, insights: 0 };
  }

  const scores = await prisma.matchScore.findMany({
    where: forOrganisation(organisationId, {
      eventId,
      subjectId,
    }),
    orderBy: { score: "desc" },
    take: TOP_CANDIDATES,
  });

  const eligibleScores = scores.filter((row) => matchBandFromScore(row.score) != null);
  if (eligibleScores.length === 0) {
    return { ranked: 0, insights: 0 };
  }

  const candidateIds = eligibleScores.map((row) => row.candidateId);
  const candidates = await prisma.attendee.findMany({
    where: {
      id: { in: candidateIds },
      eventId,
      organisationId,
    },
    include: {
      profile: true,
      matchProfile: true,
      privacy: true,
      category: { select: { matchmakingEligible: true } },
    },
  });
  const candidateById = new Map(candidates.map((row) => [row.id, row]));

  let ranked = 0;
  let insights = 0;

  if (flags.attendeeOptIn) {
    const rankInput = eligibleScores
      .map((row) => {
        const candidate = candidateById.get(row.candidateId);
        if (!candidate || !isMatchCandidate(candidate)) return null;
        const reasons = parseMatchReasons(row.reasons, candidate.country);
        return {
          id: candidate.id,
          structuredScore: row.score,
          summary: profileSummary(candidate),
          labels: reasons.labels,
        };
      })
      .filter((row): row is NonNullable<typeof row> => row != null);

    const rankResult = await generateAiRankings({
      subjectId: subject.id,
      subjectSummary: profileSummary(subject),
      candidates: rankInput,
    });

    if (rankResult.rankings) {
      for (const item of rankResult.rankings) {
        const candidate = candidateById.get(item.candidateId);
        if (!candidate || !isMatchCandidate(candidate)) continue;
        await prisma.matchScore.updateMany({
          where: {
            subjectId: subject.id,
            candidateId: item.candidateId,
            eventId,
            organisationId,
          },
          data: {
            aiRankScore: item.rankScore,
            aiRankedAt: new Date(),
          },
        });
        ranked += 1;
      }
    }
  }

  if (flags.attendeeOptIn) {
    let generated = 0;
    for (const row of eligibleScores) {
      if (generated >= BATCH_AI_LIMIT_PER_SUBJECT) break;
      if (row.aiInsight) continue;

      const candidate = candidateById.get(row.candidateId);
      if (!candidate || !isMatchCandidate(candidate)) continue;
      if (!candidate.privacy?.aiInsightsOptIn) continue;

      const meQ = parseQuestionnaire(subject.matchProfile?.questionnaire);
      const targetQ = parseQuestionnaire(candidate.matchProfile?.questionnaire);
      const reasons = parseMatchReasons(row.reasons, candidate.country);

      const result = await generateMatchInsight(
        {
          interests: asStringArray(subject.profile?.interests),
          lookingFor: meQ.lookingFor,
          offering: meQ.offering,
          industries: meQ.industries,
          geographies: meQ.geographies,
        },
        {
          interests: asStringArray(candidate.profile?.interests),
          lookingFor: targetQ.lookingFor,
          offering: targetQ.offering,
          industries: targetQ.industries,
          geographies: targetQ.geographies,
        },
        row.score,
        reasons.labels,
      );

      if (result.insight) {
        await prisma.matchScore.update({
          where: { id: row.id },
          data: { aiInsight: result.insight },
        });
        insights += 1;
        generated += 1;
      }
    }
  }

  return { ranked, insights };
}

export async function runMatchmakingPipeline(
  eventId: string,
  organisationId: string,
  options?: { userId?: string; subjectIds?: string[] },
): Promise<BatchPipelineResult> {
  const limited = await rateLimit(`matchmaking-batch:${eventId}`, 5, 3600);
  if (!limited.success) {
    throw new Error("Batch matchmaking rate limit reached. Try again later.");
  }

  const scoreResult = await recomputeMatchScoresForEvent(eventId);
  const errors: string[] = [];
  let aiRanked = 0;
  let aiInsights = 0;
  let skipped = 0;

  const settings = await prisma.eventSettings.findUnique({
    where: { eventId },
    select: { aiInsightsEnabled: true },
  });

  let subjectIds = options?.subjectIds;
  if (!subjectIds) {
    const attendees = await prisma.attendee.findMany({
      where: forOrganisation(organisationId, { eventId }),
      select: { id: true },
    });
    subjectIds = attendees.map((row) => row.id);
  }

  if (settings?.aiInsightsEnabled) {
    for (const subjectId of subjectIds) {
      try {
        const result = await batchGenerateAiForSubject(
          eventId,
          subjectId,
          organisationId,
        );
        aiRanked += result.ranked;
        aiInsights += result.insights;
        if (result.error) errors.push(result.error);
      } catch (err) {
        skipped += 1;
        errors.push(err instanceof Error ? err.message : "AI batch failed");
      }
    }
  }

  if (options?.userId) {
    await writeAudit({
      organisationId,
      eventId,
      userId: options.userId,
      action: "matchmaking.batch.run",
      resource: "match_score",
      metadata: {
        pairs: scoreResult.pairs,
        aiRanked,
        aiInsights,
        skipped,
      },
    });
  }

  return {
    scoresRecomputed: scoreResult.pairs,
    aiRanked,
    aiInsights,
    skipped,
    errors,
  };
}

/** Recompute scores for one attendee and optionally refresh AI layer. */
export async function refreshAttendeeMatchmaking(
  eventId: string,
  attendeeId: string,
) {
  await recomputeMatchScoresForAttendee(eventId, attendeeId);
  const attendee = await prisma.attendee.findFirst({
    where: { id: attendeeId, eventId },
    select: { organisationId: true },
  });
  if (!attendee) return;

  const settings = await prisma.eventSettings.findUnique({
    where: { eventId },
    select: { aiInsightsEnabled: true },
  });
  if (!settings?.aiInsightsEnabled) return;

  await batchGenerateAiForSubject(eventId, attendeeId, attendee.organisationId);
}
