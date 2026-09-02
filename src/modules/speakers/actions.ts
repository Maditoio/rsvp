"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { requireEvent } from "@/lib/authz/require";
import { runAction } from "@/lib/action-result";
import { writeAudit } from "@/modules/audit/log";
import { uploadEventAssetImage } from "@/modules/files/upload-event-logo";
import {
  createSpeakerSchema,
  updateSpeakerSchema,
} from "./config";
import { nextSpeakerSortOrder } from "./service";

function speakerPaths(orgSlug: string, eventId: string, eventSlug?: string) {
  const paths = [
    `/app/${orgSlug}/events/${eventId}/speakers`,
    `/app/${orgSlug}/events/${eventId}/website`,
  ];
  if (eventSlug) {
    paths.push(`/e/${orgSlug}/${eventSlug}`);
  }
  return paths;
}

async function revalidateSpeakerPaths(
  orgSlug: string,
  eventId: string,
  eventSlug?: string,
) {
  for (const path of speakerPaths(orgSlug, eventId, eventSlug)) {
    revalidatePath(path);
  }
}

function emptyToNull(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export async function createEventSpeakerAction(
  orgSlug: string,
  eventId: string,
  formData: FormData,
) {
  return runAction(async () => {
    const ctx = await requireEvent(orgSlug, eventId, "event.update");
    const input = createSpeakerSchema.parse({
      firstName: formData.get("firstName"),
      lastName: formData.get("lastName"),
      jobTitle: formData.get("jobTitle"),
      organization: formData.get("organization"),
      country: formData.get("country"),
      bio: formData.get("bio"),
      linkedInUrl: formData.get("linkedInUrl"),
      websiteUrl: formData.get("websiteUrl"),
      featured: formData.get("featured"),
      hidden: formData.get("hidden"),
    });

    const count = await prisma.eventSpeaker.count({
      where: { organisationId: ctx.organisation.id, eventId },
    });
    if (count >= 100) {
      throw new Error("You can add up to 100 speakers per event.");
    }

    const sortOrder = await nextSpeakerSortOrder(ctx.organisation.id, eventId);

    const speaker = await prisma.eventSpeaker.create({
      data: {
        organisationId: ctx.organisation.id,
        eventId,
        firstName: input.firstName,
        lastName: input.lastName?.trim() ?? "",
        jobTitle: emptyToNull(input.jobTitle),
        organization: emptyToNull(input.organization),
        country: emptyToNull(input.country),
        bio: emptyToNull(input.bio),
        linkedInUrl: input.linkedInUrl,
        websiteUrl: input.websiteUrl,
        featured: input.featured ?? false,
        hidden: input.hidden ?? false,
        sortOrder,
      },
      select: { id: true, firstName: true, lastName: true },
    });

    await writeAudit({
      organisationId: ctx.organisation.id,
      eventId,
      userId: ctx.user.id,
      action: "speaker.create",
      resource: "event_speaker",
      resourceId: speaker.id,
      metadata: {
        name: `${speaker.firstName} ${speaker.lastName}`.trim(),
      },
    });

    await revalidateSpeakerPaths(orgSlug, eventId);
    return { speaker };
  }, "Could not add speaker.");
}

export async function updateEventSpeakerAction(
  orgSlug: string,
  eventId: string,
  formData: FormData,
) {
  return runAction(async () => {
    const ctx = await requireEvent(orgSlug, eventId, "event.update");
    const input = updateSpeakerSchema.parse({
      id: formData.get("id"),
      firstName: formData.get("firstName"),
      lastName: formData.get("lastName"),
      jobTitle: formData.get("jobTitle"),
      organization: formData.get("organization"),
      country: formData.get("country"),
      bio: formData.get("bio"),
      linkedInUrl: formData.get("linkedInUrl"),
      websiteUrl: formData.get("websiteUrl"),
      featured: formData.get("featured"),
      hidden: formData.get("hidden"),
    });

    const existing = await prisma.eventSpeaker.findFirst({
      where: {
        id: input.id,
        eventId,
        organisationId: ctx.organisation.id,
      },
    });
    if (!existing) throw new Error("Speaker not found.");

    const speaker = await prisma.eventSpeaker.update({
      where: { id: input.id },
      data: {
        firstName: input.firstName,
        lastName: input.lastName?.trim() ?? "",
        jobTitle: emptyToNull(input.jobTitle),
        organization: emptyToNull(input.organization),
        country: emptyToNull(input.country),
        bio: emptyToNull(input.bio),
        linkedInUrl: input.linkedInUrl,
        websiteUrl: input.websiteUrl,
        featured: input.featured ?? false,
        hidden: input.hidden ?? false,
      },
      select: { id: true, firstName: true, lastName: true },
    });

    await writeAudit({
      organisationId: ctx.organisation.id,
      eventId,
      userId: ctx.user.id,
      action: "speaker.update",
      resource: "event_speaker",
      resourceId: speaker.id,
    });

    await revalidateSpeakerPaths(orgSlug, eventId);
    return { speaker };
  }, "Could not update speaker.");
}

export async function deleteEventSpeakerAction(
  orgSlug: string,
  eventId: string,
  speakerId: string,
) {
  return runAction(async () => {
    const ctx = await requireEvent(orgSlug, eventId, "event.update");
    const existing = await prisma.eventSpeaker.findFirst({
      where: {
        id: speakerId,
        eventId,
        organisationId: ctx.organisation.id,
      },
    });
    if (!existing) throw new Error("Speaker not found.");

    await prisma.eventSpeaker.delete({ where: { id: speakerId } });

    await writeAudit({
      organisationId: ctx.organisation.id,
      eventId,
      userId: ctx.user.id,
      action: "speaker.delete",
      resource: "event_speaker",
      resourceId: speakerId,
      metadata: {
        name: `${existing.firstName} ${existing.lastName}`.trim(),
      },
    });

    await revalidateSpeakerPaths(orgSlug, eventId);
    return { ok: true as const };
  }, "Could not remove speaker.");
}

export async function reorderEventSpeakerAction(
  orgSlug: string,
  eventId: string,
  speakerId: string,
  direction: "up" | "down",
) {
  return runAction(async () => {
    const ctx = await requireEvent(orgSlug, eventId, "event.update");
    const speaker = await prisma.eventSpeaker.findFirst({
      where: {
        id: speakerId,
        eventId,
        organisationId: ctx.organisation.id,
      },
    });
    if (!speaker) throw new Error("Speaker not found.");

    const siblings = await prisma.eventSpeaker.findMany({
      where: { organisationId: ctx.organisation.id, eventId },
      orderBy: [{ sortOrder: "asc" }, { firstName: "asc" }],
      select: { id: true, sortOrder: true },
    });

    const index = siblings.findIndex((s) => s.id === speakerId);
    const swapIndex = direction === "up" ? index - 1 : index + 1;
    const swap = siblings[swapIndex];
    if (!swap || index < 0) return { ok: true as const };

    await prisma.$transaction([
      prisma.eventSpeaker.update({
        where: { id: speaker.id },
        data: { sortOrder: swap.sortOrder },
      }),
      prisma.eventSpeaker.update({
        where: { id: swap.id },
        data: { sortOrder: speaker.sortOrder },
      }),
    ]);

    await revalidateSpeakerPaths(orgSlug, eventId);
    return { ok: true as const };
  }, "Could not reorder speaker.");
}

export async function uploadEventSpeakerPhotoAction(
  orgSlug: string,
  eventId: string,
  formData: FormData,
) {
  return runAction(async () => {
    const ctx = await requireEvent(orgSlug, eventId, "event.update");
    const speakerId = String(formData.get("speakerId") ?? "").trim();
    if (!speakerId) throw new Error("Speaker is required.");

    const file = formData.get("photo");
    if (!(file instanceof File) || file.size === 0) {
      throw new Error("Choose a photo to upload.");
    }

    const speaker = await prisma.eventSpeaker.findFirst({
      where: {
        id: speakerId,
        eventId,
        organisationId: ctx.organisation.id,
      },
    });
    if (!speaker) throw new Error("Speaker not found.");

    const { url } = await uploadEventAssetImage({
      organisationId: ctx.organisation.id,
      eventId,
      file,
      pathnameSuffix: `speakers/${speakerId}`,
    });

    await prisma.eventSpeaker.update({
      where: { id: speakerId },
      data: { photoUrl: url },
    });

    await writeAudit({
      organisationId: ctx.organisation.id,
      eventId,
      userId: ctx.user.id,
      action: "speaker.photo_upload",
      resource: "event_speaker",
      resourceId: speakerId,
    });

    await revalidateSpeakerPaths(orgSlug, eventId);
    return { url };
  }, "Could not upload speaker photo.");
}

export async function removeEventSpeakerPhotoAction(
  orgSlug: string,
  eventId: string,
  speakerId: string,
) {
  return runAction(async () => {
    const ctx = await requireEvent(orgSlug, eventId, "event.update");
    const speaker = await prisma.eventSpeaker.findFirst({
      where: {
        id: speakerId,
        eventId,
        organisationId: ctx.organisation.id,
      },
    });
    if (!speaker) throw new Error("Speaker not found.");

    await prisma.eventSpeaker.update({
      where: { id: speakerId },
      data: { photoUrl: null },
    });

    await revalidateSpeakerPaths(orgSlug, eventId);
    return { ok: true as const };
  }, "Could not remove speaker photo.");
}

export async function toggleEventSpeakerHiddenAction(
  orgSlug: string,
  eventId: string,
  speakerId: string,
  hidden: boolean,
) {
  return runAction(async () => {
    const ctx = await requireEvent(orgSlug, eventId, "event.update");
    const speaker = await prisma.eventSpeaker.findFirst({
      where: {
        id: speakerId,
        eventId,
        organisationId: ctx.organisation.id,
      },
    });
    if (!speaker) throw new Error("Speaker not found.");

    await prisma.eventSpeaker.update({
      where: { id: speakerId },
      data: { hidden },
    });

    await revalidateSpeakerPaths(orgSlug, eventId);
    return { ok: true as const };
  }, "Could not update speaker visibility.");
}
