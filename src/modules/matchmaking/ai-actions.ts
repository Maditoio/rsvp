"use server";

import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/authz/require";
import { AuthzError } from "@/lib/db/tenant";
import { rateLimit } from "@/lib/rate-limit";
import { writeAudit } from "@/modules/audit/log";
import {
  asStringArray,
  parseQuestionnaire,
  parseMatchReasons,
} from "./score";
import { generateMatchInsight } from "./ai-insights";

export async function getAiInsight(eventId: string, targetAttendeeId: string) {
  const user = await requireUser();
  const me = await prisma.attendee.findFirst({
    where: { eventId, userId: user.id },
    include: {
      profile: true,
      matchProfile: true,
      privacy: true,
    },
  });
  if (!me) throw new AuthzError("You are not registered for this event", 403);

  const settings = await prisma.eventSettings.findUnique({
    where: { eventId },
    select: { aiInsightsEnabled: true },
  });
  if (!settings?.aiInsightsEnabled) {
    throw new Error("AI insights are not enabled for this event.");
  }

  if (!me.privacy?.aiInsightsOptIn) {
    throw new Error("Enable AI insights in your privacy settings first.");
  }

  const target = await prisma.attendee.findFirst({
    where: { id: targetAttendeeId, eventId, organisationId: me.organisationId },
    include: {
      profile: true,
      matchProfile: true,
      privacy: true,
    },
  });
  if (!target) throw new Error("Attendee not found");

  if (!target.privacy?.aiInsightsOptIn) {
    throw new Error("This attendee has not enabled AI insights.");
  }

  const rl = await rateLimit(`ai-insight:${me.id}`, 20, 3600);
  if (!rl.success) {
    throw new Error("Rate limit reached. Try again later.");
  }

  const existing = await prisma.matchScore.findUnique({
    where: { subjectId_candidateId: { subjectId: me.id, candidateId: target.id } },
  });

  if (existing?.aiInsight) {
    return { insight: existing.aiInsight };
  }

  const meQ = parseQuestionnaire(me.matchProfile?.questionnaire);
  const targetQ = parseQuestionnaire(target.matchProfile?.questionnaire);
  const reasons = existing
    ? parseMatchReasons(existing.reasons, target.country)
    : parseMatchReasons(null, target.country);

  const profileA = {
    interests: asStringArray(me.profile?.interests),
    lookingFor: meQ.lookingFor,
    offering: meQ.offering,
    industries: meQ.industries,
    geographies: meQ.geographies,
  };
  const profileB = {
    interests: asStringArray(target.profile?.interests),
    lookingFor: targetQ.lookingFor,
    offering: targetQ.offering,
    industries: targetQ.industries,
    geographies: targetQ.geographies,
  };

  const result = await generateMatchInsight(
    profileA,
    profileB,
    existing?.score ?? 0,
    reasons.labels,
  );

  if (result.insight && existing) {
    await prisma.matchScore.update({
      where: { id: existing.id },
      data: { aiInsight: result.insight },
    });
  }

  await writeAudit({
    organisationId: me.organisationId,
    eventId,
    userId: user.id,
    action: "matchmaking.ai_insight.request",
    resource: "match_score",
    resourceId: existing?.id,
  });

  if (result.error) {
    throw new Error(result.error);
  }

  return { insight: result.insight! };
}
