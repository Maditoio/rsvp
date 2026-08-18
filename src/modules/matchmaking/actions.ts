"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/authz/require";
import { AuthzError } from "@/lib/db/tenant";
import { rateLimit } from "@/lib/rate-limit";
import { writeAudit } from "@/modules/audit/log";
import { recomputeMatchScoresForAttendee } from "@/modules/matchmaking/score";
import {
  parseQuestionnaire,
  toAttendeeProfileSummary,
  type MatchmakingQuestionnaire,
} from "@/modules/matchmaking/questionnaire";

const saveSchema = z.object({
  lookingFor: z.array(z.string()),
  offering: z.array(z.string()),
  industries: z.array(z.string()),
  geographies: z.array(z.string()),
  meetingPreferences: z.array(z.string()),
  profileVisible: z.boolean(),
  matchmakingEnabled: z.boolean(),
});

async function myAttendee(eventId: string) {
  const user = await requireUser();
  const attendee = await prisma.attendee.findFirst({
    where: { eventId, userId: user.id },
    include: {
      profile: true,
      privacy: true,
      matchProfile: true,
      event: { select: { name: true } },
    },
  });
  if (!attendee) {
    throw new AuthzError("You are not registered for this event", 403);
  }
  return { user, attendee };
}

export type MatchmakingLoad = {
  eventId: string;
  eventName: string;
  questionnaire: MatchmakingQuestionnaire;
  complete: boolean;
  privacy: {
    profileVisible: boolean;
    matchmakingEnabled: boolean;
  };
};

export async function loadMyMatchmaking(eventId: string): Promise<MatchmakingLoad> {
  const { attendee } = await myAttendee(eventId);
  const questionnaire = parseQuestionnaire(attendee.matchProfile?.questionnaire);
  return {
    eventId,
    eventName: attendee.event.name,
    questionnaire,
    complete: Boolean(questionnaire.completedAt),
    privacy: {
      profileVisible: attendee.privacy?.profileVisible ?? true,
      matchmakingEnabled: attendee.privacy?.matchmakingEnabled ?? false,
    },
  };
}

export async function saveMatchmakingQuestionnaire(
  eventId: string,
  input: z.input<typeof saveSchema>,
) {
  const parsed = saveSchema.parse(input);
  const { user, attendee } = await myAttendee(eventId);

  const limited = await rateLimit(
    `matchmaking-save:${user.id}:${attendee.organisationId}:${eventId}`,
    20,
    60,
  );
  if (!limited.success) {
    throw new Error("Too many saves. Try again shortly.");
  }

  const questionnaire = parseQuestionnaire({
    ...parsed,
    completedAt: new Date().toISOString(),
  });
  const summary = toAttendeeProfileSummary(questionnaire);
  const questionnaireJson = questionnaire as Prisma.InputJsonValue;

  await prisma.$transaction(async (tx) => {
    await tx.matchmakingProfile.upsert({
      where: { attendeeId: attendee.id },
      create: {
        organisationId: attendee.organisationId,
        eventId: attendee.eventId,
        attendeeId: attendee.id,
        questionnaire: questionnaireJson,
      },
      update: { questionnaire: questionnaireJson },
    });

    await tx.attendeeProfile.upsert({
      where: { attendeeId: attendee.id },
      create: {
        organisationId: attendee.organisationId,
        eventId: attendee.eventId,
        attendeeId: attendee.id,
        about: attendee.profile?.about ?? null,
        lookingFor: summary.lookingFor,
        offering: summary.offering,
        interests: summary.interests,
      },
      update: {
        lookingFor: summary.lookingFor,
        offering: summary.offering,
        interests: summary.interests,
      },
    });

    await tx.attendeePrivacy.upsert({
      where: { attendeeId: attendee.id },
      create: {
        organisationId: attendee.organisationId,
        eventId: attendee.eventId,
        attendeeId: attendee.id,
        profileVisible: parsed.profileVisible,
        matchmakingEnabled: parsed.matchmakingEnabled,
      },
      update: {
        profileVisible: parsed.profileVisible,
        matchmakingEnabled: parsed.matchmakingEnabled,
      },
    });
  });

  await recomputeMatchScoresForAttendee(attendee.eventId, attendee.id);

  await writeAudit({
    organisationId: attendee.organisationId,
    eventId: attendee.eventId,
    userId: user.id,
    action: "matchmaking.questionnaire.save",
    resource: "matchmaking_profile",
    resourceId: attendee.id,
  });

  revalidatePath(`/me/events/${eventId}`);
  revalidatePath(`/me/events/${eventId}/matchmaking`);
  revalidatePath(`/me/events/${eventId}/directory`);
  revalidatePath(`/me/events/${eventId}/profile`);
  revalidatePath(`/me/events/${eventId}/privacy`);

  return { complete: true };
}
