import "server-only";

import { put } from "@vercel/blob";
import { prisma } from "@/lib/db/prisma";
import { formatEventWindow } from "@/lib/utils";
import {
  blobStorageNotConfiguredMessage,
  isBlobStorageConfigured,
} from "@/modules/files/blob-config";
import { renderInviteHeroPng } from "@/modules/communications/invite-hero-render";
import { invalidateEventMailContextCache } from "@/modules/communications/email-mail-context";
import {
  parseEmailHeroGradientStyle,
  parseHeroBlur,
} from "@/modules/communications/invite-hero-background";

function detailLinesFromSettings(detail: string | null | undefined): string[] {
  if (!detail?.trim()) return [];
  return detail
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

/**
 * Rebuild the cached invitation hero image from event branding settings.
 * Returns the public URL, or null when overlay mode is off / cannot render.
 */
export async function regenerateEventInviteHero(input: {
  organisationId: string;
  eventId: string;
  /** Optional: use this buffer instead of re-fetching the banner URL. */
  backgroundBuffer?: Buffer | null;
  /** When true, turn overlay on before generating (e.g. upload while UI toggle is on). */
  enableOverlay?: boolean;
}): Promise<string | null> {
  if (input.enableOverlay) {
    await prisma.eventSettings.upsert({
      where: { eventId: input.eventId },
      create: {
        organisationId: input.organisationId,
        eventId: input.eventId,
        emailHeroOverlayEnabled: true,
      },
      update: { emailHeroOverlayEnabled: true },
    });
  }

  const event = await prisma.event.findFirst({
    where: { id: input.eventId, organisationId: input.organisationId },
    select: {
      name: true,
      venue: true,
      timezone: true,
      startsAt: true,
      endsAt: true,
      logoUrl: true,
      settings: {
        select: {
          emailAccentColor: true,
          emailBannerUrl: true,
          emailHeroOverlayEnabled: true,
          emailHeroEyebrow: true,
          emailHeroTitle: true,
          emailHeroDetail: true,
          emailHeroClosing: true,
          emailHeroBackgroundMode: true,
          emailHeroGradientStyle: true,
          emailHeroBlur: true,
          websiteConfig: true,
        },
      },
    },
  });

  if (!event?.settings?.emailHeroOverlayEnabled) {
    await prisma.eventSettings.updateMany({
      where: { eventId: input.eventId, organisationId: input.organisationId },
      data: { emailHeroImageUrl: null },
    });
    invalidateEventMailContextCache(input.organisationId, input.eventId);
    return null;
  }

  if (!isBlobStorageConfigured()) {
    throw new Error(blobStorageNotConfiguredMessage());
  }

  const accent = event.settings.emailAccentColor?.trim() || "#4F46E5";

  const when = formatEventWindow(
    event.startsAt,
    event.endsAt,
    event.timezone,
  );
  const autoDetail = [
    event.venue?.trim() ? event.venue.trim() : null,
    when !== "Dates TBC" ? when : null,
  ].filter(Boolean) as string[];

  const customDetail = detailLinesFromSettings(event.settings.emailHeroDetail);
  const backgroundUrl = event.settings.emailBannerUrl;
  const backgroundMode = event.settings.emailHeroBackgroundMode ?? "COLOR";
  const { png, usedBackgroundPhoto } = await renderInviteHeroPng({
    backgroundBuffer: input.backgroundBuffer,
    backgroundUrl,
    backgroundMode,
    gradientStyle: parseEmailHeroGradientStyle(
      event.settings.emailHeroGradientStyle,
    ),
    blur: parseHeroBlur(event.settings.emailHeroBlur, 6),
    logoUrl: event.logoUrl,
    accentColor: accent,
    eyebrow:
      event.settings.emailHeroEyebrow?.trim() || "Join us as we attend the",
    title: event.settings.emailHeroTitle?.trim() || event.name,
    detailLines: customDetail.length > 0 ? customDetail : autoDetail,
    closing:
      event.settings.emailHeroClosing?.trim() || "Can't wait to see you there!",
  });

  if (
    backgroundMode === "IMAGE" &&
    (backgroundUrl || input.backgroundBuffer) &&
    !usedBackgroundPhoto
  ) {
    throw new Error(
      "Could not load the banner image for the invitation hero. Re-upload a PNG, JPEG, or WebP banner and try again.",
    );
  }

  const pathname = `orgs/${input.organisationId}/events/${input.eventId}/invite-hero.png`;
  const blob = await put(pathname, png, {
    access: "public",
    contentType: "image/png",
    addRandomSuffix: true,
    // Fresh URL each regenerate so email clients don't show a cached old hero.
  });

  await prisma.eventSettings.upsert({
    where: { eventId: input.eventId },
    create: {
      organisationId: input.organisationId,
      eventId: input.eventId,
      emailHeroOverlayEnabled: true,
      emailHeroImageUrl: blob.url,
      emailHeroEyebrow: event.settings.emailHeroEyebrow,
      emailHeroTitle: event.settings.emailHeroTitle,
      emailHeroDetail: event.settings.emailHeroDetail,
      emailHeroClosing: event.settings.emailHeroClosing,
      emailAccentColor: event.settings.emailAccentColor,
      emailBannerUrl: event.settings.emailBannerUrl,
    },
    update: { emailHeroImageUrl: blob.url },
  });

  invalidateEventMailContextCache(input.organisationId, input.eventId);
  return blob.url;
}
