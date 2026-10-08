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
import { regenerateEventInviteHero } from "@/modules/communications/invite-hero";
import {
  parseBrandHeadingColor,
  parseBrandHeadingFont,
  parseBrandHeadingSize,
  parseFocalPercent,
} from "@/modules/branding/brand-heading-style";
import {
  parseBannerBlur,
  parseEmailHeroBackgroundMode,
  parseEmailHeroGradientStyle,
  parseHeroBlur,
} from "@/modules/communications/invite-hero-background";
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
  emailHeroBackgroundMode: z.enum(["IMAGE", "COLOR", "GRADIENT"]),
  emailHeroGradientStyle: z.enum(["indigo", "violet", "teal"]),
  emailHeroBlur: z.number().int().min(0).max(24),
  emailHeroFocalX: z.number().int().min(0).max(100),
  emailHeroFocalY: z.number().int().min(0).max(100),
  emailBannerMode: z.enum(["IMAGE", "COLOR", "GRADIENT"]),
  emailBannerGradientStyle: z.enum(["indigo", "violet", "teal"]),
  emailBannerBlur: z.number().int().min(0).max(24),
  emailBannerFocalX: z.number().int().min(0).max(100),
  emailBannerFocalY: z.number().int().min(0).max(100),
  brandHeadingColor: z
    .string()
    .trim()
    .regex(/^#([0-9A-Fa-f]{6}|[0-9A-Fa-f]{3})$/, "Use a valid hex colour")
    .optional()
    .or(z.literal("")),
  brandHeadingFont: z.enum(["inter", "serif", "modern"]),
  brandHeadingSize: z.enum(["sm", "md", "lg"]),
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
    emailHeroBackgroundMode: parseEmailHeroBackgroundMode(
      formData.get("emailHeroBackgroundMode"),
    ),
    emailHeroGradientStyle: parseEmailHeroGradientStyle(
      formData.get("emailHeroGradientStyle"),
    ),
    emailHeroBlur: parseHeroBlur(formData.get("emailHeroBlur"), 6),
    emailHeroFocalX: parseFocalPercent(formData.get("emailHeroFocalX"), 50),
    emailHeroFocalY: parseFocalPercent(formData.get("emailHeroFocalY"), 50),
    emailBannerMode: parseEmailHeroBackgroundMode(
      formData.get("emailBannerMode"),
    ),
    emailBannerGradientStyle: parseEmailHeroGradientStyle(
      formData.get("emailBannerGradientStyle"),
    ),
    emailBannerBlur: parseBannerBlur(formData.get("emailBannerBlur"), 0),
    emailBannerFocalX: parseFocalPercent(formData.get("emailBannerFocalX"), 50),
    emailBannerFocalY: parseFocalPercent(formData.get("emailBannerFocalY"), 50),
    brandHeadingColor: String(formData.get("brandHeadingColor") ?? ""),
    brandHeadingFont: parseBrandHeadingFont(formData.get("brandHeadingFont")),
    brandHeadingSize: parseBrandHeadingSize(formData.get("brandHeadingSize")),
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
    emailHeroOverlayEnabled: parsed.emailHeroOverlayEnabled,
    emailHeroEyebrow: parsed.emailHeroEyebrow || null,
    emailHeroTitle: parsed.emailHeroTitle || null,
    emailHeroDetail: parsed.emailHeroDetail || null,
    emailHeroClosing: parsed.emailHeroClosing || null,
    emailHeroBackgroundMode: parsed.emailHeroBackgroundMode,
    emailHeroGradientStyle:
      parsed.emailHeroBackgroundMode === "GRADIENT"
        ? parsed.emailHeroGradientStyle
        : null,
    emailHeroBlur: parsed.emailHeroBlur,
    emailHeroFocalX: parsed.emailHeroFocalX,
    emailHeroFocalY: parsed.emailHeroFocalY,
    brandHeadingColor,
    brandHeadingFont: parsed.brandHeadingFont,
    brandHeadingSize: parsed.brandHeadingSize,
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

  const enableHero = ["true", "on", "1"].includes(
    String(formData.get("enableHero") ?? ""),
  );

  const backgroundBuffer = Buffer.from(await file.arrayBuffer());
  // Re-wrap — reading arrayBuffer consumes the original File in some runtimes.
  const uploadFile = new File([backgroundBuffer], file.name || "banner.jpg", {
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
      "Upload a PNG, JPEG, or WebP banner (SVG is not supported in email).",
    );
  }

  await prisma.eventSettings.upsert({
    where: { eventId },
    create: {
      organisationId: ctx.organisation.id,
      eventId,
      emailBannerUrl: safeUrl,
      emailBannerMode: "IMAGE",
      emailHeroOverlayEnabled: enableHero,
    },
    update: {
      emailBannerUrl: safeUrl,
      emailBannerMode: "IMAGE",
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
    action: "communications.email_banner.upload",
    resource: "event_settings",
    resourceId: eventId,
  });

  revalidateBrandingPaths(orgSlug, eventId);
  return { url: safeUrl, heroImageUrl };
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

  await safeRegenerateHero(ctx.organisation.id, eventId);
  invalidateEventMailContextCache(ctx.organisation.id, eventId);

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
