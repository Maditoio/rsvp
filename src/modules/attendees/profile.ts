"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/authz/require";
import { AuthzError } from "@/lib/db/tenant";

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

  await prisma.attendeeProfile.upsert({
    where: { attendeeId: attendee.id },
    create: {
      organisationId: attendee.organisationId,
      eventId,
      attendeeId: attendee.id,
      about: input.about || null,
      lookingFor: input.lookingFor || null,
      offering: input.offering || null,
      interests,
    },
    update: {
      about: input.about || null,
      lookingFor: input.lookingFor || null,
      offering: input.offering || null,
      interests,
    },
  });
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
  });

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
    },
    update: {
      profileVisible: input.profileVisible === "true",
      matchmakingEnabled: input.matchmakingEnabled === "true",
      showEmail: input.showEmail === "true",
      showPhone: input.showPhone === "true",
    },
  });
  revalidatePath(`/me/events/${eventId}/privacy`);
  revalidatePath(`/me/events/${eventId}/directory`);
}
