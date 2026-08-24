import { prisma } from "@/lib/db/prisma";
import { forOrganisation } from "@/lib/db/tenant";
import { displayName } from "@/lib/utils";
import {
  isMatchCandidate,
  matchBandFromScore,
  matchBandLabel,
  parseMatchReasons,
} from "./score";

export type SuggestedPairing = {
  id: string;
  subjectId: string;
  candidateId: string;
  subjectName: string;
  candidateName: string;
  subjectCompany: string | null;
  candidateCompany: string | null;
  structuredScore: number;
  rankScore: number;
  band: ReturnType<typeof matchBandFromScore>;
  bandLabel: string | null;
  reasonsSummary: string;
  aiInsight: string | null;
};

const TOP_PAIRINGS = 50;

export async function loadSuggestedPairings(
  organisationId: string,
  eventId: string,
): Promise<SuggestedPairing[]> {
  const scores = await prisma.matchScore.findMany({
    where: forOrganisation(organisationId, { eventId }),
    include: {
      subject: {
        include: {
          privacy: true,
          category: { select: { matchmakingEligible: true } },
        },
      },
      candidate: {
        include: {
          privacy: true,
          category: { select: { matchmakingEligible: true } },
        },
      },
    },
  });

  const eligible = scores.filter(
    (row) =>
      isMatchCandidate(row.subject) &&
      isMatchCandidate(row.candidate) &&
      matchBandFromScore(row.score) != null,
  );

  const pairKey = (a: string, b: string) => (a < b ? `${a}:${b}` : `${b}:${a}`);
  const bestByPair = new Map<string, (typeof eligible)[number]>();

  for (const row of eligible) {
    const key = pairKey(row.subjectId, row.candidateId);
    const existing = bestByPair.get(key);
    const rowRank = row.aiRankScore ?? row.score;
    const existingRank = existing
      ? (existing.aiRankScore ?? existing.score)
      : -Infinity;
    if (!existing || rowRank > existingRank) {
      bestByPair.set(key, row);
    }
  }

  const ranked = [...bestByPair.values()]
    .map((row) => ({
      row,
      rankScore: row.aiRankScore ?? row.score,
    }))
    .sort((a, b) => b.rankScore - a.rankScore)
    .slice(0, TOP_PAIRINGS);

  return ranked.map(({ row, rankScore }) => {
    const band = matchBandFromScore(row.score);
    const reasons = parseMatchReasons(row.reasons, row.candidate.country);
    const reasonsSummary =
      reasons.labels.length > 0
        ? reasons.labels.slice(0, 4).join(" · ")
        : "Structured match score";

    return {
      id: `${row.subjectId}-${row.candidateId}`,
      subjectId: row.subjectId,
      candidateId: row.candidateId,
      subjectName: displayName(row.subject),
      candidateName: displayName(row.candidate),
      subjectCompany: row.subject.company,
      candidateCompany: row.candidate.company,
      structuredScore: row.score,
      rankScore,
      band,
      bandLabel: matchBandLabel(band),
      reasonsSummary,
      aiInsight: row.aiInsight,
    };
  });
}
