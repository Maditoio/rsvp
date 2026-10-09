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
import { sendBrandingPreviewEmail } from "@/modules/communications/email";
import { regenerateEventInviteHero } from "@/modules/communications/invite-hero";
import {
  formatBrandHeadingSize,
  parseBrandHeadingAlign,
  parseBrandHeadingColor,
  parseBrandHeadingEyebrowUppercase,
  parseBrandHeadingFont,
  parseBrandHeadingLineHeight,
  parseBrandHeadingSize,
  parseBrandHeadingTracking,
  parseBrandHeadingWeight,
  parseFocalPercent,
} from "@/modules/branding/brand-heading-style";
import {
  parseBannerBlur,
  parseEmailHeroBackgroundMode,
  parseEmailHeroGradientStyle,
  parseHeroBlur,
  parseHeroOverlay,
} from "@/modules/communications/invite-hero-background";
import { parsePhotoZoom } from "@/modules/branding/cover-focal";
import {
  formatInviteHighlights,
  INVITE_HIGHLIGHT_MAX_RAW,
} from "@/modules/communications/invite-highlights";
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
  emailHeroOverlayEnabled: z.boolean(),
  emailHeroEyebrow: z.string().trim().max(120).optional().or(z.literal("")),
  emailHeroTitle: z.string().trim().max(160).optional().or(z.literal("")),
  emailHeroDetail: z.string().trim().max(600).optional().or(z.literal("")),
  emailHeroClosing: z.string().trim().max(160).optional().or(z.literal("")),
  emailInviteHighlights: z
    .string()
    .trim()
    .max(INVITE_HIGHLIGHT_MAX_RAW)
    .optional()
    .or(z.literal("")),
  emailHeroBackgroundMode: z.enum(["IMAGE", "COLOR", "GRADIENT"]),
  emailHeroGradientStyle: z.enum(["indigo", "violet", "teal"]),
  emailHeroBlur: z.number().int().min(0).max(24),
  emailHeroOverlay: z.number().int().min(0).max(100),
  emailHeroFocalX: z.number().int().min(0).max(100),
  emailHeroFocalY: z.number().int().min(0).max(100),
  emailHeroZoom: z.number().int().min(100).max(200),
  emailBannerMode: z.enum(["IMAGE", "COLOR", "GRADIENT"]),
  emailBannerGradientStyle: z.enum(["indigo", "violet", "teal"]),
  emailBannerBlur: z.number().int().min(0).max(24),
  emailBannerFocalX: z.number().int().min(0).max(100),
  emailBannerFocalY: z.number().int().min(0).max(100),
  emailBannerZoom: z.number().int().min(100).max(200),
  brandHeadingColor: z
    .string()
    .trim()
    .regex(/^#([0-9A-Fa-f]{6}|[0-9A-Fa-f]{3})$/, "Use a valid hex colour")
    .optional()
    .or(z.literal("")),
  brandHeadingFont: z.enum([
    "inter",
    "dm-sans",
    "source-serif",
    "manrope",
    "jakarta",
    "space-grotesk",
    "playfair",
    "outfit",
    "serif",
    "modern",
  ]),
  brandHeadingSize: z.number().int().min(24).max(120),
  brandHeadingWeight: z.enum(["regular", "medium", "semibold", "bold"]),
  brandHeadingTracking: z.enum(["tight", "normal", "wide"]),
  brandHeadingAlign: z.enum(["left", "center"]),
  brandHeadingLineHeight: z.enum(["tight", "normal", "relaxed"]),
  brandHeadingEyebrowUppercase: z.boolean(),
});

function revalidateBrandingPaths(orgSlug: string, eventId: string) {
  revalidatePath(`/app/${orgSlug}/events/${eventId}/branding`);
  revalidatePath(`/app/${orgSlug}/events/${eventId}/communications`);
  revalidatePath(`/app/${orgSlug}/events/${eventId}/settings`);
  revalidatePath(`/a/${orgSlug}`, "layout");
}

async function safeRegenerateHero(
  organisationId: string,
  eventId: string,
  opts?: { backgroundBuffer?: Buffer | null; enableOverlay?: boolean },
) {
  try {
    return await regenerateEventInviteHero({
      organisationId,
      eventId,
      backgroundBuffer: opts?.backgroundBuffer,
      enableOverlay: opts?.enableOverlay,
    });
  } catch (error) {
    console.error("invite hero regenerate failed", error);
    throw error instanceof Error
      ? error
      : new Error("Could not rebuild the invitation hero image.");
  }
}

/** Persist hero on/off immediately so refresh matches what the user chose. */
export async function setInvitationHeroEnabled(
  orgSlug: string,
  eventId: string,
  enabled: boolean,
) {
  const ctx = await requireEvent(orgSlug, eventId, "event.update");

  await prisma.eventSettings.upsert({
    where: { eventId },
    create: {
      organisationId: ctx.organisation.id,
      eventId,
      emailHeroOverlayEnabled: enabled,
    },
    update: { emailHeroOverlayEnabled: enabled },
  });

  try {
    if (enabled) {
      await safeRegenerateHero(ctx.organisation.id, eventId);
    } else {
      await prisma.eventSettings.updateMany({
        where: { eventId, organisationId: ctx.organisation.id },
        data: { emailHeroImageUrl: null },
      });
    }
  } catch (error) {
    await prisma.eventSettings.updateMany({
      where: { eventId, organisationId: ctx.organisation.id },
      data: {
        emailHeroOverlayEnabled: false,
        emailHeroImageUrl: null,
      },
    });
    throw error;
  }

  invalidateEventMailContextCache(ctx.organisation.id, eventId);
  revalidateBrandingPaths(orgSlug, eventId);
}

export async function saveEmailBranding(
  orgSlug: string,
  eventId: string,
  formData: FormData,
) {
  const ctx = await requireEvent(orgSlug, eventId, "event.update");
  const parsed = brandingSchema.parse({
    emailAccentColor: String(formData.get("emailAccentColor") ?? ""),
    emailHeroOverlayEnabled: ["true", "on", "1"].includes(
      String(formData.get("emailHeroOverlayEnabled") ?? ""),
    ),
    emailHeroEyebrow: String(formData.get("emailHeroEyebrow") ?? ""),
    emailHeroTitle: String(formData.get("emailHeroTitle") ?? ""),
    emailHeroDetail: String(formData.get("emailHeroDetail") ?? ""),
    emailHeroClosing: String(formData.get("emailHeroClosing") ?? ""),
    emailInviteHighlights: String(formData.get("emailInviteHighlights") ?? ""),
    emailHeroBackgroundMode: parseEmailHeroBackgroundMode(
      formData.get("emailHeroBackgroundMode"),
    ),
    emailHeroGradientStyle: parseEmailHeroGradientStyle(
      formData.get("emailHeroGradientStyle"),
    ),
    emailHeroBlur: parseHeroBlur(formData.get("emailHeroBlur"), 6),
    emailHeroOverlay: parseHeroOverlay(formData.get("emailHeroOverlay"), 55),
    emailHeroFocalX: parseFocalPercent(formData.get("emailHeroFocalX"), 50),
    emailHeroFocalY: parseFocalPercent(formData.get("emailHeroFocalY"), 50),
    emailHeroZoom: parsePhotoZoom(formData.get("emailHeroZoom"), 100),
    emailBannerMode: parseEmailHeroBackgroundMode(
      formData.get("emailBannerMode"),
    ),
    emailBannerGradientStyle: parseEmailHeroGradientStyle(
      formData.get("emailBannerGradientStyle"),
    ),
    emailBannerBlur: parseBannerBlur(formData.get("emailBannerBlur"), 0),
    emailBannerFocalX: parseFocalPercent(formData.get("emailBannerFocalX"), 50),
    emailBannerFocalY: parseFocalPercent(formData.get("emailBannerFocalY"), 50),
    emailBannerZoom: parsePhotoZoom(formData.get("emailBannerZoom"), 100),
    brandHeadingColor: String(formData.get("brandHeadingColor") ?? ""),
    brandHeadingFont: parseBrandHeadingFont(formData.get("brandHeadingFont")),
    brandHeadingSize: parseBrandHeadingSize(formData.get("brandHeadingSize")),
    brandHeadingWeight: parseBrandHeadingWeight(
      formData.get("brandHeadingWeight"),
    ),
    brandHeadingTracking: parseBrandHeadingTracking(
      formData.get("brandHeadingTracking"),
    ),
    brandHeadingAlign: parseBrandHeadingAlign(
      formData.get("brandHeadingAlign"),
    ),
    brandHeadingLineHeight: parseBrandHeadingLineHeight(
      formData.get("brandHeadingLineHeight"),
    ),
    brandHeadingEyebrowUppercase: parseBrandHeadingEyebrowUppercase(
      formData.get("brandHeadingEyebrowUppercase"),
    ),
  });

  const emailAccentColor = parsed.emailAccentColor
    ? parseEmailHexColor(parsed.emailAccentColor)
    : null;
  const brandHeadingColor = parseBrandHeadingColor(parsed.brandHeadingColor);

  const brandingFields = {
    emailBannerMode: parsed.emailBannerMode,
    emailBannerGradientStyle:
      parsed.emailBannerMode === "GRADIENT"
        ? parsed.emailBannerGradientStyle
        : null,
    emailBannerBlur: parsed.emailBannerBlur,
    emailBannerFocalX: parsed.emailBannerFocalX,
    emailBannerFocalY: parsed.emailBannerFocalY,
    emailBannerZoom: parsed.emailBannerZoom,
    emailHeroOverlayEnabled: parsed.emailHeroOverlayEnabled,
    emailHeroEyebrow: parsed.emailHeroEyebrow || null,
    emailHeroTitle: parsed.emailHeroTitle || null,
    emailHeroDetail: parsed.emailHeroDetail || null,
    emailHeroClosing: parsed.emailHeroClosing || null,
    emailInviteHighlights: formatInviteHighlights(parsed.emailInviteHighlights),
    emailHeroBackgroundMode: parsed.emailHeroBackgroundMode,
    emailHeroGradientStyle:
      parsed.emailHeroBackgroundMode === "GRADIENT"
        ? parsed.emailHeroGradientStyle
        : null,
    emailHeroBlur: parsed.emailHeroBlur,
    emailHeroOverlay: parsed.emailHeroOverlay,
    emailHeroFocalX: parsed.emailHeroFocalX,
    emailHeroFocalY: parsed.emailHeroFocalY,
    emailHeroZoom: parsed.emailHeroZoom,
    brandHeadingColor,
    brandHeadingFont: parsed.brandHeadingFont,
    brandHeadingSize: formatBrandHeadingSize(parsed.brandHeadingSize),
    brandHeadingWeight: parsed.brandHeadingWeight,
    brandHeadingTracking: parsed.brandHeadingTracking,
    brandHeadingAlign: parsed.brandHeadingAlign,
    brandHeadingLineHeight: parsed.brandHeadingLineHeight,
    brandHeadingEyebrowUppercase: parsed.brandHeadingEyebrowUppercase,
  };

  await prisma.eventSettings.upsert({
    where: { eventId },
    create: {
      organisationId: ctx.organisation.id,
      eventId,
      emailAccentColor,
      ...brandingFields,
    },
    update: {
      emailAccentColor,
      ...brandingFields,
    },
  });

  await safeRegenerateHero(ctx.organisation.id, eventId);
  invalidateEventMailContextCache(ctx.organisation.id, eventId);

  await writeAudit({
    organisationId: ctx.organisation.id,
    eventId,
    userId: ctx.user.id,
    action: "communications.email_branding.update",
    resource: "event_settings",
    resourceId: eventId,
    metadata: {
      emailAccentColor,
      emailHeroOverlayEnabled: parsed.emailHeroOverlayEnabled,
    },
  });

  revalidateBrandingPaths(orgSlug, eventId);
}

export async function uploadEmailBanner(
  orgSlug: string,
  eventId: string,
  formData: FormData,
) {
  const ctx = await requireEvent(orgSlug, eventId, "event.update");
  if (!isBlobStorageConfigured()) {
    throw new Error(blobStorageNotConfiguredMessage());
  }

  const file = formData.get("banner");
  if (!(file instanceof File) || file.size === 0) {
    throw new Error("Choose a banner image to upload.");
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  // Re-wrap — reading arrayBuffer consumes the original File in some runtimes.
  const uploadFile = new File([bytes], file.name || "banner.jpg", {
    type: file.type || "image/jpeg",
  });

  const { url } = await uploadEventAssetImage({
    organisationId: ctx.organisation.id,
    eventId,
    file: uploadFile,
    pathnameSuffix: "email-banner",
    kind: "background",
  });

  const safeUrl = emailSafeImageUrl(url);
  if (!safeUrl) {
    throw new Error(
      "Upload a PNG, JPEG, or WebP banner (SVG is not supported).",
    );
  }

  await prisma.eventSettings.upsert({
    where: { eventId },
    create: {
      organisationId: ctx.organisation.id,
      eventId,
      emailBannerUrl: safeUrl,
      emailBannerMode: "IMAGE",
    },
    update: {
      emailBannerUrl: safeUrl,
      emailBannerMode: "IMAGE",
    },
  });

  await writeAudit({
    organisationId: ctx.organisation.id,
    eventId,
    userId: ctx.user.id,
    action: "communications.email_banner.upload",
    resource: "event_settings",
    resourceId: eventId,
  });

  revalidateBrandingPaths(orgSlug, eventId);
  return { url: safeUrl };
}

export async function removeEmailBanner(orgSlug: string, eventId: string) {
  const ctx = await requireEvent(orgSlug, eventId, "event.update");

  await prisma.eventSettings.upsert({
    where: { eventId },
    create: {
      organisationId: ctx.organisation.id,
      eventId,
      emailBannerUrl: null,
    },
    update: { emailBannerUrl: null },
  });

  await writeAudit({
    organisationId: ctx.organisation.id,
    eventId,
    userId: ctx.user.id,
    action: "communications.email_banner.remove",
    resource: "event_settings",
    resourceId: eventId,
  });

  revalidateBrandingPaths(orgSlug, eventId);
}

/** Upload the invitation hero backdrop photo (separate from the public page banner). */
export async function uploadEmailHeroPhoto(
  orgSlug: string,
  eventId: string,
  formData: FormData,
) {
  const ctx = await requireEvent(orgSlug, eventId, "event.update");
  if (!isBlobStorageConfigured()) {
    throw new Error(blobStorageNotConfiguredMessage());
  }

  const file = formData.get("heroPhoto");
  if (!(file instanceof File) || file.size === 0) {
    throw new Error("Choose a hero photo to upload.");
  }

  const enableHero = ["true", "on", "1"].includes(
    String(formData.get("enableHero") ?? ""),
  );

  const backgroundBuffer = Buffer.from(await file.arrayBuffer());
  const uploadFile = new File(
    [backgroundBuffer],
    file.name || "hero-photo.jpg",
    { type: file.type || "image/jpeg" },
  );

  const { url } = await uploadEventAssetImage({
    organisationId: ctx.organisation.id,
    eventId,
    file: uploadFile,
    pathnameSuffix: "email-hero-photo",
    kind: "background",
  });

  const safeUrl = emailSafeImageUrl(url);
  if (!safeUrl) {
    throw new Error(
      "Upload a PNG, JPEG, or WebP photo (SVG is not supported in email).",
    );
  }

  await prisma.eventSettings.upsert({
    where: { eventId },
    create: {
      organisationId: ctx.organisation.id,
      eventId,
      emailHeroPhotoUrl: safeUrl,
      emailHeroBackgroundMode: "IMAGE",
      emailHeroOverlayEnabled: enableHero,
    },
    update: {
      emailHeroPhotoUrl: safeUrl,
      emailHeroBackgroundMode: "IMAGE",
      ...(enableHero ? { emailHeroOverlayEnabled: true } : {}),
    },
  });

  const heroImageUrl = await safeRegenerateHero(ctx.organisation.id, eventId, {
    backgroundBuffer,
    enableOverlay: enableHero,
  });
  invalidateEventMailContextCache(ctx.organisation.id, eventId);

  await writeAudit({
    organisationId: ctx.organisation.id,
    eventId,
    userId: ctx.user.id,
    action: "communications.email_hero_photo.upload",
    resource: "event_settings",
    resourceId: eventId,
  });

  revalidateBrandingPaths(orgSlug, eventId);
  return { url: safeUrl, heroImageUrl };
}

export async function removeEmailHeroPhoto(orgSlug: string, eventId: string) {
  const ctx = await requireEvent(orgSlug, eventId, "event.update");

  await prisma.eventSettings.upsert({
    where: { eventId },
    create: {
      organisationId: ctx.organisation.id,
      eventId,
      emailHeroPhotoUrl: null,
    },
    update: { emailHeroPhotoUrl: null },
  });

  await safeRegenerateHero(ctx.organisation.id, eventId);
  invalidateEventMailContextCache(ctx.organisation.id, eventId);

  await writeAudit({
    organisationId: ctx.organisation.id,
    eventId,
    userId: ctx.user.id,
    action: "communications.email_hero_photo.remove",
    resource: "event_settings",
    resourceId: eventId,
  });

  revalidateBrandingPaths(orgSlug, eventId);
}

export async function regenerateInviteHeroAction(
  orgSlug: string,
  eventId: string,
) {
  const ctx = await requireEvent(orgSlug, eventId, "event.update");
  const url = await regenerateEventInviteHero({
    organisationId: ctx.organisation.id,
    eventId,
  });
  revalidateBrandingPaths(orgSlug, eventId);
  return { url };
}

/** Email a branding sample to the signed-in organiser (not a real invitation). */
export async function sendBrandingPreviewAction(
  orgSlug: string,
  eventId: string,
): Promise<{ ok: true; to: string; simulated: boolean } | { ok: false; error: string }> {
  const ctx = await requireEvent(orgSlug, eventId, "event.update");
  const toEmail = ctx.user.email?.trim();
  if (!toEmail) {
    return { ok: false, error: "Your account has no email address." };
  }

  try {
    if (await prisma.eventSettings.findFirst({
      where: {
        eventId,
        organisationId: ctx.organisation.id,
        emailHeroOverlayEnabled: true,
      },
      select: { eventId: true },
    })) {
      await safeRegenerateHero(ctx.organisation.id, eventId);
    }
    invalidateEventMailContextCache(ctx.organisation.id, eventId);

    const toName =
      [ctx.user.firstName, ctx.user.lastName].filter(Boolean).join(" ") ||
      "there";
    const result = await sendBrandingPreviewEmail({
      organisationId: ctx.organisation.id,
      eventId,
      toEmail,
      toName,
    });

    await writeAudit({
      organisationId: ctx.organisation.id,
      eventId,
      userId: ctx.user.id,
      action: "communications.email_branding.preview",
      resource: "event_settings",
      resourceId: eventId,
      metadata: { toEmail, simulated: result.simulated },
    });

    return { ok: true, to: toEmail, simulated: result.simulated };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "Could not send branding preview.",
    };
  }
}
