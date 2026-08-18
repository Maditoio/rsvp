"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/authz/require";
import { AuthzError } from "@/lib/db/tenant";
import { isQuestionnaireComplete } from "@/modules/matchmaking/questionnaire";
import { recomputeMatchScoresForAttendee } from "@/modules/matchmaking/score";

const profileSchema = z.object({
  about: z.string().max(2000).optional().or(z.literal("")),
  lookingFor: z.string().max(500).optional().or(z.literal("")),
  offering: z.string().max(500).optional().or(z.literal("")),
  interests: z.string().max(500).optional().or(z.literal("")),
});

const privacySchema = z.object({
  profileVisible: z.enum(["true", "false"]).optional(),
  matchmakingEnabled: z.enum(["true", "false"]).optional(),
  showEmail: z.enum(["true", "false"]).optional(),
  showPhone: z.enum(["true", "false"]).optional(),
  aiInsightsOptIn: z.enum(["true", "false"]).optional(),
});

async function myAttendee(eventId: string) {
  const user = await requireUser();
  const attendee = await prisma.attendee.findFirst({
    where: { eventId, userId: user.id },
    include: { profile: true, privacy: true },
  });
  if (!attendee) throw new AuthzError("You are not registered for this event", 403);
  return attendee;
}

export async function saveMyProfile(eventId: string, formData: FormData) {
  const attendee = await myAttendee(eventId);
  const input = profileSchema.parse({
    about: String(formData.get("about") ?? ""),
    lookingFor: String(formData.get("lookingFor") ?? ""),
    offering: String(formData.get("offering") ?? ""),
    interests: String(formData.get("interests") ?? ""),
  });
  const interests = input.interests
    ? input.interests.split(",").map((value) => value.trim()).filter(Boolean)
    : [];

  const matchProfile = await prisma.matchmakingProfile.findUnique({
    where: { attendeeId: attendee.id },
    select: { questionnaire: true },
  });
  const questionnaireOwnsNetworking = isQuestionnaireComplete(
    matchProfile?.questionnaire,
  );

  await prisma.attendeeProfile.upsert({
    where: { attendeeId: attendee.id },
    create: {
      organisationId: attendee.organisationId,
      eventId,
      attendeeId: attendee.id,
      about: input.about || null,
      lookingFor: questionnaireOwnsNetworking
        ? (attendee.profile?.lookingFor ?? null)
        : input.lookingFor || null,
      offering: questionnaireOwnsNetworking
        ? (attendee.profile?.offering ?? null)
        : input.offering || null,
      interests: questionnaireOwnsNetworking
        ? (attendee.profile?.interests ?? [])
        : interests,
    },
    update: questionnaireOwnsNetworking
      ? { about: input.about || null }
      : {
          about: input.about || null,
          lookingFor: input.lookingFor || null,
          offering: input.offering || null,
          interests,
        },
  });

  if (!questionnaireOwnsNetworking) {
    await recomputeMatchScoresForAttendee(eventId, attendee.id);
  }

  revalidatePath(`/me/events/${eventId}/profile`);
  revalidatePath(`/me/events/${eventId}/directory`);
}

export async function saveMyPrivacy(eventId: string, formData: FormData) {
  const attendee = await myAttendee(eventId);
  const input = privacySchema.parse({
    profileVisible: formData.get("profileVisible") ? "true" : "false",
    matchmakingEnabled: formData.get("matchmakingEnabled") ? "true" : "false",
    showEmail: formData.get("showEmail") ? "true" : "false",
    showPhone: formData.get("showPhone") ? "true" : "false",
    aiInsightsOptIn: formData.get("aiInsightsOptIn") ? "true" : "false",
  });

  const settings = await prisma.eventSettings.findFirst({
    where: { eventId, organisationId: attendee.organisationId },
    select: { aiInsightsEnabled: true },
  });
  const eventAiEnabled = settings?.aiInsightsEnabled === true;
  const aiInsightsOptIn = eventAiEnabled
    ? input.aiInsightsOptIn === "true"
    : (attendee.privacy?.aiInsightsOptIn ?? false);

  await prisma.attendeePrivacy.upsert({
    where: { attendeeId: attendee.id },
    create: {
      organisationId: attendee.organisationId,
      eventId,
      attendeeId: attendee.id,
      profileVisible: input.profileVisible === "true",
      matchmakingEnabled: input.matchmakingEnabled === "true",
      showEmail: input.showEmail === "true",
      showPhone: input.showPhone === "true",
      aiInsightsOptIn,
    },
    update: {
      profileVisible: input.profileVisible === "true",
      matchmakingEnabled: input.matchmakingEnabled === "true",
      showEmail: input.showEmail === "true",
      showPhone: input.showPhone === "true",
      aiInsightsOptIn,
    },
  });
  revalidatePath(`/me/events/${eventId}/privacy`);
  revalidatePath(`/me/events/${eventId}/directory`);
}
