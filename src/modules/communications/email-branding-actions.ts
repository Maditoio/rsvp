"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { requireEvent } from "@/lib/authz/require";
import { writeAudit } from "@/modules/audit/log";
import {
  emailSafeImageUrl,
  parseEmailHexColor,
} from "@/modules/communications/email-branding";
import { invalidateEventMailContextCache } from "@/modules/communications/email-mail-context";
import {
  blobStorageNotConfiguredMessage,
  isBlobStorageConfigured,
} from "@/modules/files/blob-config";
import { uploadEventAssetImage } from "@/modules/files/upload-event-logo";

const brandingSchema = z.object({
  emailAccentColor: z
    .string()
    .trim()
    .regex(/^#([0-9A-Fa-f]{6}|[0-9A-Fa-f]{3})$/, "Use a valid hex colour")
    .optional()
    .or(z.literal("")),
});

export async function saveEmailBranding(
  orgSlug: string,
  eventId: string,
  formData: FormData,
) {
  const ctx = await requireEvent(orgSlug, eventId, "invitations.write");
  const parsed = brandingSchema.parse({
    emailAccentColor: String(formData.get("emailAccentColor") ?? ""),
  });

  const emailAccentColor = parsed.emailAccentColor
    ? parseEmailHexColor(parsed.emailAccentColor)
    : null;

  await prisma.eventSettings.upsert({
    where: { eventId },
    create: {
      organisationId: ctx.organisation.id,
      eventId,
      emailAccentColor,
    },
    update: { emailAccentColor },
  });

  invalidateEventMailContextCache(ctx.organisation.id, eventId);

  await writeAudit({
    organisationId: ctx.organisation.id,
    eventId,
    userId: ctx.user.id,
    action: "communications.email_branding.update",
    resource: "event_settings",
    resourceId: eventId,
    metadata: { emailAccentColor },
  });

  revalidatePath(`/app/${orgSlug}/events/${eventId}/communications`);
  revalidatePath(`/app/${orgSlug}/events/${eventId}/settings`);
}

export async function uploadEmailBanner(
  orgSlug: string,
  eventId: string,
  formData: FormData,
) {
  const ctx = await requireEvent(orgSlug, eventId, "invitations.write");
  if (!isBlobStorageConfigured()) {
    throw new Error(blobStorageNotConfiguredMessage());
  }

  const file = formData.get("banner");
  if (!(file instanceof File) || file.size === 0) {
    throw new Error("Choose a banner image to upload.");
  }

  const { url } = await uploadEventAssetImage({
    organisationId: ctx.organisation.id,
    eventId,
    file,
    pathnameSuffix: "email-banner",
    kind: "background",
  });

  const safeUrl = emailSafeImageUrl(url);
  if (!safeUrl) {
    throw new Error("Upload a PNG, JPEG, or WebP banner (SVG is not supported in email).");
  }

  await prisma.eventSettings.upsert({
    where: { eventId },
    create: {
      organisationId: ctx.organisation.id,
      eventId,
      emailBannerUrl: safeUrl,
    },
    update: { emailBannerUrl: safeUrl },
  });

  invalidateEventMailContextCache(ctx.organisation.id, eventId);

  await writeAudit({
    organisationId: ctx.organisation.id,
    eventId,
    userId: ctx.user.id,
    action: "communications.email_banner.upload",
    resource: "event_settings",
    resourceId: eventId,
  });

  revalidatePath(`/app/${orgSlug}/events/${eventId}/communications`);
  return { url: safeUrl };
}

export async function removeEmailBanner(orgSlug: string, eventId: string) {
  const ctx = await requireEvent(orgSlug, eventId, "invitations.write");

  await prisma.eventSettings.upsert({
    where: { eventId },
    create: {
      organisationId: ctx.organisation.id,
      eventId,
      emailBannerUrl: null,
    },
    update: { emailBannerUrl: null },
  });

  invalidateEventMailContextCache(ctx.organisation.id, eventId);

  await writeAudit({
    organisationId: ctx.organisation.id,
    eventId,
    userId: ctx.user.id,
    action: "communications.email_banner.remove",
    resource: "event_settings",
    resourceId: eventId,
  });

  revalidatePath(`/app/${orgSlug}/events/${eventId}/communications`);
}
