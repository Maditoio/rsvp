import { prisma } from "@/lib/db/prisma";
import { forOrganisation } from "@/lib/db/tenant";
import { displayName } from "@/lib/utils";
import {
  isMatchCandidate,
  parseMatchReasons,
  matchBandFromScore,
  matchBandLabel,
} from "./score";

export type PairingDetail = {
  subjectId: string;
  candidateId: string;
  subjectName: string;
  candidateName: string;
  structuredScore: number;
  rankScore: number;
  bandLabel: string | null;
  reasons: ReturnType<typeof parseMatchReasons>;
  aiInsight: string | null;
  hasExistingMeeting: boolean;
  hasPendingRequest: boolean;
};

export async function loadPairingDetail(
  organisationId: string,
  eventId: string,
  subjectId: string,
  candidateId: string,
): Promise<PairingDetail | null> {
  const score = await prisma.matchScore.findFirst({
    where: forOrganisation(organisationId, {
      eventId,
      subjectId,
      candidateId,
    }),
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

  if (!score || !isMatchCandidate(score.subject) || !isMatchCandidate(score.candidate)) {
    return null;
  }

  const [existingMeeting, pendingRequest] = await Promise.all([
    prisma.meeting.findFirst({
      where: {
        organisationId,
        eventId,
        status: { not: "CANCELLED" },
        AND: [
          { participants: { some: { attendeeId: subjectId } } },
          { participants: { some: { attendeeId: candidateId } } },
        ],
      },
      select: { id: true },
    }),
    prisma.meetingRequest.findFirst({
      where: {
        organisationId,
        eventId,
        status: "PENDING",
        OR: [
          { requesterId: subjectId, targetId: candidateId },
          { requesterId: candidateId, targetId: subjectId },
        ],
      },
      select: { id: true },
    }),
  ]);

  const band = matchBandFromScore(score.score);
  const reasons = parseMatchReasons(score.reasons, score.candidate.country);

  return {
    subjectId,
    candidateId,
    subjectName: displayName(score.subject),
    candidateName: displayName(score.candidate),
    structuredScore: score.score,
    rankScore: score.aiRankScore ?? score.score,
    bandLabel: matchBandLabel(band),
    reasons,
    aiInsight: score.aiInsight,
    hasExistingMeeting: Boolean(existingMeeting),
    hasPendingRequest: Boolean(pendingRequest),
  };
}
