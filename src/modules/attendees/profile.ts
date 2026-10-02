"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/authz/require";
import { AuthzError } from "@/lib/db/tenant";
import { writeAudit } from "@/modules/audit/log";
import { uploadEventAssetImage } from "@/modules/files/upload-event-logo";
import { isQuestionnaireComplete } from "@/modules/matchmaking/questionnaire";
import { recomputeMatchScoresForAttendee } from "@/modules/matchmaking/score";
import {
  fieldVisibilityToJson,
  parseVisibilityFromFormData,
} from "@/modules/privacy";

const optionalUrl = z
  .string()
  .max(300)
  .optional()
  .or(z.literal(""))
  .refine(
    (value) => {
      if (!value) return true;
      try {
        const parsed = new URL(value.includes("://") ? value : `https://${value}`);
        return parsed.protocol === "http:" || parsed.protocol === "https:";
      } catch {
        return false;
      }
    },
    { message: "Enter a valid URL" },
  );

const profileSchema = z.object({
  about: z.string().max(2000).optional().or(z.literal("")),
  lookingFor: z.string().max(500).optional().or(z.literal("")),
  offering: z.string().max(500).optional().or(z.literal("")),
  interests: z.string().max(500).optional().or(z.literal("")),
  industry: z.string().max(120).optional().or(z.literal("")),
  website: optionalUrl,
  linkedinUrl: optionalUrl,
});

const privacySchema = z.object({
  profileVisible: z.enum(["true", "false"]).optional(),
  matchmakingEnabled: z.enum(["true", "false"]).optional(),
  aiInsightsOptIn: z.enum(["true", "false"]).optional(),
});

function normalizeUrl(value: string | undefined): string | null {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) return null;
  if (trimmed.includes("://")) return trimmed;
  return `https://${trimmed}`;
}

async function myAttendee(eventId: string) {
  const user = await requireUser();
  const attendee = await prisma.attendee.findFirst({
    where: { eventId, userId: user.id },
    include: { profile: true, privacy: true },
  });
  if (!attendee) throw new AuthzError("You are not registered for this event", 403);
  return { user, attendee };
}

function revalidateProfilePaths(eventId: string) {
  revalidatePath(`/me/events/${eventId}/profile`);
  revalidatePath(`/me/events/${eventId}/directory`);
}

export async function saveMyProfile(eventId: string, formData: FormData) {
  const { user, attendee } = await myAttendee(eventId);
  const input = profileSchema.parse({
    about: String(formData.get("about") ?? ""),
    lookingFor: String(formData.get("lookingFor") ?? ""),
    offering: String(formData.get("offering") ?? ""),
    interests: String(formData.get("interests") ?? ""),
    industry: String(formData.get("industry") ?? ""),
    website: String(formData.get("website") ?? ""),
    linkedinUrl: String(formData.get("linkedinUrl") ?? ""),
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

  const profileData = {
    about: input.about || null,
    industry: input.industry || null,
    website: normalizeUrl(input.website),
    linkedinUrl: normalizeUrl(input.linkedinUrl),
    lookingFor: questionnaireOwnsNetworking
      ? (attendee.profile?.lookingFor ?? null)
      : input.lookingFor || null,
    offering: questionnaireOwnsNetworking
      ? (attendee.profile?.offering ?? null)
      : input.offering || null,
    interests: questionnaireOwnsNetworking
      ? (attendee.profile?.interests ?? [])
      : interests,
  };

  await prisma.attendeeProfile.upsert({
    where: { attendeeId: attendee.id },
    create: {
      organisationId: attendee.organisationId,
      eventId,
      attendeeId: attendee.id,
      ...profileData,
      photoUrl: attendee.profile?.photoUrl ?? null,
    },
    update: questionnaireOwnsNetworking
      ? {
          about: profileData.about,
          industry: profileData.industry,
          website: profileData.website,
          linkedinUrl: profileData.linkedinUrl,
        }
      : {
          about: profileData.about,
          industry: profileData.industry,
          website: profileData.website,
          linkedinUrl: profileData.linkedinUrl,
          lookingFor: profileData.lookingFor,
          offering: profileData.offering,
          interests: profileData.interests,
        },
  });

  await writeAudit({
    organisationId: attendee.organisationId,
    eventId,
    userId: user.id,
    action: "attendee.profile.update",
    resource: "attendee_profile",
    resourceId: attendee.id,
    ip: (await headers()).get("x-forwarded-for"),
  });

  if (!questionnaireOwnsNetworking) {
    await recomputeMatchScoresForAttendee(eventId, attendee.id);
  }

  revalidateProfilePaths(eventId);
}

export async function uploadMyProfilePhoto(eventId: string, formData: FormData) {
  const { user, attendee } = await myAttendee(eventId);
  const file = formData.get("photo");
  if (!(file instanceof File) || file.size === 0) {
    throw new Error("Choose a photo to upload.");
  }

  const { url } = await uploadEventAssetImage({
    organisationId: attendee.organisationId,
    eventId,
    file,
    pathnameSuffix: `attendees/${attendee.id}/photo`,
  });

  await prisma.attendeeProfile.upsert({
    where: { attendeeId: attendee.id },
    create: {
      organisationId: attendee.organisationId,
      eventId,
      attendeeId: attendee.id,
      photoUrl: url,
    },
    update: { photoUrl: url },
  });

  await writeAudit({
    organisationId: attendee.organisationId,
    eventId,
    userId: user.id,
    action: "attendee.profile.photo_upload",
    resource: "attendee_profile",
    resourceId: attendee.id,
    ip: (await headers()).get("x-forwarded-for"),
  });

  revalidateProfilePaths(eventId);
  return { url };
}

export async function useAccountPhotoForProfile(eventId: string) {
  const { user, attendee } = await myAttendee(eventId);
  if (!user.imageUrl) {
    throw new Error("Your account has no photo to use.");
  }

  await prisma.attendeeProfile.upsert({
    where: { attendeeId: attendee.id },
    create: {
      organisationId: attendee.organisationId,
      eventId,
      attendeeId: attendee.id,
      photoUrl: user.imageUrl,
    },
    update: { photoUrl: user.imageUrl },
  });

  await writeAudit({
    organisationId: attendee.organisationId,
    eventId,
    userId: user.id,
    action: "attendee.profile.photo_from_account",
    resource: "attendee_profile",
    resourceId: attendee.id,
    ip: (await headers()).get("x-forwarded-for"),
  });

  revalidateProfilePaths(eventId);
  return { url: user.imageUrl };
}

export async function removeMyProfilePhoto(eventId: string) {
  const { user, attendee } = await myAttendee(eventId);

  await prisma.attendeeProfile.upsert({
    where: { attendeeId: attendee.id },
    create: {
      organisationId: attendee.organisationId,
      eventId,
      attendeeId: attendee.id,
      photoUrl: null,
    },
    update: { photoUrl: null },
  });

  await writeAudit({
    organisationId: attendee.organisationId,
    eventId,
    userId: user.id,
    action: "attendee.profile.photo_remove",
    resource: "attendee_profile",
    resourceId: attendee.id,
    ip: (await headers()).get("x-forwarded-for"),
  });

  revalidateProfilePaths(eventId);
}

export async function saveMyPrivacy(eventId: string, formData: FormData) {
  const { user, attendee } = await myAttendee(eventId);
  const input = privacySchema.parse({
    profileVisible: formData.get("profileVisible") ? "true" : "false",
    matchmakingEnabled: formData.get("matchmakingEnabled") ? "true" : "false",
    aiInsightsOptIn: formData.get("aiInsightsOptIn") ? "true" : "false",
  });

  const profileVisible = input.profileVisible === "true";
  const fieldVisibility = parseVisibilityFromFormData(formData, {
    profileVisible,
  });
  const showEmail = fieldVisibility.email;
  const showPhone = fieldVisibility.phone;
  const visibilityJson = fieldVisibilityToJson(fieldVisibility);

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
      profileVisible,
      matchmakingEnabled: input.matchmakingEnabled === "true",
      showEmail,
      showPhone,
      aiInsightsOptIn,
      visibility: visibilityJson,
    },
    update: {
      profileVisible,
      matchmakingEnabled: input.matchmakingEnabled === "true",
      showEmail,
      showPhone,
      aiInsightsOptIn,
      visibility: visibilityJson,
    },
  });

  await writeAudit({
    organisationId: attendee.organisationId,
    eventId,
    userId: user.id,
    action: "attendee.privacy.update",
    resource: "attendee_privacy",
    resourceId: attendee.id,
    metadata: {
      profileVisible,
      matchmakingEnabled: input.matchmakingEnabled === "true",
      showEmail,
      showPhone,
      aiInsightsOptIn,
      visibility: fieldVisibility,
    },
    ip: (await headers()).get("x-forwarded-for"),
  });

  revalidatePath(`/me/events/${eventId}/privacy`);
  revalidatePath(`/me/events/${eventId}/directory`);
}
