"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireEvent } from "@/lib/authz/require";
import { runAction } from "@/lib/action-result";
import { writeAudit } from "@/modules/audit/log";
import {
  uploadEventLogo,
  removeEventLogo,
  uploadEventAssetImage,
} from "@/modules/files/upload-event-logo";
import {
  badgeConfigSchema,
  parseBadgeConfig,
  parseBadgeFont,
  parseBadgeSize,
  parseCategoryStyle,
  parseNameWeight,
  parseTextAlign,
  parseBadgeLayout,
  parseHexColor,
  parseTextFill,
  BADGE_SIZE_DEFAULTS,
  getLayoutPreset,
  type BadgeConfig,
  type BadgeSponsor,
} from "./config";
import { parseGradientAngle } from "./colors";
import { BADGE_TEMPLATE_IDS } from "./templates";
import { BADGE_DESIGN_IDS } from "./designs";
import { ensureBadgeRecord, loadBadgePrintPayload } from "./service";
import { prisma } from "@/lib/db/prisma";
import type { Prisma } from "@prisma/client";

function newSponsorId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `sp_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function badgePaths(orgSlug: string, eventId: string) {
  return [
    `/app/${orgSlug}/events/${eventId}/badges`,
    `/app/${orgSlug}/events/${eventId}/day/badges`,
    `/app/${orgSlug}/events/${eventId}/day`,
    `/app/${orgSlug}/events/${eventId}/settings`,
  ];
}

async function saveBadgeConfig(
  organisationId: string,
  eventId: string,
  config: BadgeConfig,
) {
  const json = config as unknown as Prisma.InputJsonValue;
  await prisma.eventSettings.upsert({
    where: { eventId },
    create: {
      organisationId,
      eventId,
      badgeConfig: json,
    },
    update: { badgeConfig: json },
  });
}

function parseSizeField(
  formData: FormData,
  key: string,
  existing: number,
  fallback: number = existing,
): number {
  return parseBadgeSize(formData.get(key), fallback, fallback);
}

function parseSettingsForm(formData: FormData, existing: BadgeConfig): BadgeConfig {
  const designIdRaw = String(formData.get("designId") ?? existing.designId);
  const designId = BADGE_DESIGN_IDS.includes(
    designIdRaw as (typeof BADGE_DESIGN_IDS)[number],
  )
    ? (designIdRaw as BadgeConfig["designId"])
    : existing.designId;

  const selectedSponsorIds = formData
    .getAll("selectedSponsorIds")
    .map(String)
    .filter(Boolean);

  let layout = existing.layout ?? getLayoutPreset(designId);
  const layoutRaw = formData.get("layout");
  if (typeof layoutRaw === "string" && layoutRaw.trim()) {
    try {
      layout = parseBadgeLayout(JSON.parse(layoutRaw), layout);
    } catch {
      // keep existing layout
    }
  }

  const next: BadgeConfig = {
    ...existing,
    templateId: String(
      formData.get("templateId") ?? existing.templateId,
    ) as BadgeConfig["templateId"],
    designId,
    showCompany: formData.get("showCompany") === "on",
    showJobTitle: formData.get("showJobTitle") === "on",
    showCategory: formData.get("showCategory") === "on",
    showCountry: formData.get("showCountry") === "on",
    showEventLogo: formData.get("showEventLogo") === "on",
    showEventName: formData.get("showEventName") === "on",
    showQr: formData.get("showQr") === "on",
    showSponsors: formData.get("showSponsors") === "on",
    stackAttendeeFields: formData.get("stackAttendeeFields") === "on",
    nameMaxLines: (() => {
      const raw = Number(formData.get("nameMaxLines"));
      if (raw === 1 || raw === 2 || raw === 3) return raw;
      return existing.nameMaxLines;
    })(),
    eventLogoPosition: String(
      formData.get("eventLogoPosition") ?? existing.eventLogoPosition,
    ) as BadgeConfig["eventLogoPosition"],
    qrPosition: String(
      formData.get("qrPosition") ?? existing.qrPosition,
    ) as BadgeConfig["qrPosition"],
    qrSize: String(formData.get("qrSize") ?? existing.qrSize) as BadgeConfig["qrSize"],
    sponsorPosition: String(
      formData.get("sponsorPosition") ?? existing.sponsorPosition,
    ) as BadgeConfig["sponsorPosition"],
    textAlign: parseTextAlign(
      formData.get("textAlign") ?? existing.textAlign,
      existing.textAlign,
    ),
    nameWeight: parseNameWeight(
      formData.get("nameWeight") ?? existing.nameWeight,
      existing.nameWeight,
    ),
    categoryStyle: parseCategoryStyle(
      formData.get("categoryStyle") ?? existing.categoryStyle,
      existing.categoryStyle,
    ),
    nameFont: parseBadgeFont(formData.get("nameFont"), existing.nameFont),
    companyFont: parseBadgeFont(formData.get("companyFont"), existing.companyFont),
    jobTitleFont: parseBadgeFont(formData.get("jobTitleFont"), existing.jobTitleFont),
    categoryFont: parseBadgeFont(formData.get("categoryFont"), existing.categoryFont),
    countryFont: parseBadgeFont(formData.get("countryFont"), existing.countryFont),
    eventNameFont: parseBadgeFont(formData.get("eventNameFont"), existing.eventNameFont),
    layout,
    nameSize: parseSizeField(
      formData,
      "nameSize",
      existing.nameSize,
      BADGE_SIZE_DEFAULTS.nameSize,
    ),
    companySize: parseSizeField(
      formData,
      "companySize",
      existing.companySize,
      BADGE_SIZE_DEFAULTS.companySize,
    ),
    jobTitleSize: parseSizeField(
      formData,
      "jobTitleSize",
      existing.jobTitleSize,
      BADGE_SIZE_DEFAULTS.jobTitleSize,
    ),
    categorySize: parseSizeField(
      formData,
      "categorySize",
      existing.categorySize,
      BADGE_SIZE_DEFAULTS.categorySize,
    ),
    countrySize: parseSizeField(
      formData,
      "countrySize",
      existing.countrySize,
      BADGE_SIZE_DEFAULTS.countrySize,
    ),
    eventNameSize: parseSizeField(
      formData,
      "eventNameSize",
      existing.eventNameSize,
      BADGE_SIZE_DEFAULTS.eventNameSize,
    ),
    eventLogoSize: parseSizeField(
      formData,
      "eventLogoSize",
      existing.eventLogoSize,
      BADGE_SIZE_DEFAULTS.eventLogoSize,
    ),
    sponsorLogoSize: parseSizeField(
      formData,
      "sponsorLogoSize",
      existing.sponsorLogoSize,
      BADGE_SIZE_DEFAULTS.sponsorLogoSize,
    ),
    qrPx: parseSizeField(formData, "qrPx", existing.qrPx, BADGE_SIZE_DEFAULTS.qrPx),
    contentGap: parseSizeField(
      formData,
      "contentGap",
      existing.contentGap,
      BADGE_SIZE_DEFAULTS.contentGap,
    ),
    padding: parseSizeField(
      formData,
      "padding",
      existing.padding,
      BADGE_SIZE_DEFAULTS.padding,
    ),
    borderRadius: parseSizeField(
      formData,
      "borderRadius",
      existing.borderRadius,
      BADGE_SIZE_DEFAULTS.borderRadius,
    ),
    letterSpacing: parseSizeField(
      formData,
      "letterSpacing",
      existing.letterSpacing,
      BADGE_SIZE_DEFAULTS.letterSpacing,
    ),
    nameColor: parseHexColor(formData.get("nameColor"), existing.nameColor),
    companyColor: parseHexColor(
      formData.get("companyColor"),
      existing.companyColor,
    ),
    jobTitleColor: parseHexColor(
      formData.get("jobTitleColor"),
      existing.jobTitleColor,
    ),
    categoryColor: parseHexColor(
      formData.get("categoryColor"),
      existing.categoryColor,
    ),
    countryColor: parseHexColor(
      formData.get("countryColor"),
      existing.countryColor,
    ),
    eventNameColor: parseHexColor(
      formData.get("eventNameColor"),
      existing.eventNameColor,
    ),
    nameFill: parseTextFill(formData.get("nameFill") ?? existing.nameFill),
    nameGradientFrom: parseHexColor(
      formData.get("nameGradientFrom"),
      existing.nameGradientFrom,
    ),
    nameGradientTo: parseHexColor(
      formData.get("nameGradientTo"),
      existing.nameGradientTo,
    ),
    nameGradientAngle: parseGradientAngle(
      formData.get("nameGradientAngle") ?? existing.nameGradientAngle,
      existing.nameGradientAngle,
    ),
    eventNameFill: parseTextFill(
      formData.get("eventNameFill") ?? existing.eventNameFill,
    ),
    eventNameGradientFrom: parseHexColor(
      formData.get("eventNameGradientFrom"),
      existing.eventNameGradientFrom,
    ),
    eventNameGradientTo: parseHexColor(
      formData.get("eventNameGradientTo"),
      existing.eventNameGradientTo,
    ),
    eventNameGradientAngle: parseGradientAngle(
      formData.get("eventNameGradientAngle") ?? existing.eventNameGradientAngle,
      existing.eventNameGradientAngle,
    ),
    qrDarkColor: parseHexColor(
      formData.get("qrDarkColor"),
      existing.qrDarkColor,
    ),
    qrLightColor: parseHexColor(
      formData.get("qrLightColor"),
      existing.qrLightColor,
    ),
    badgeBgFill: parseTextFill(
      formData.get("badgeBgFill") ?? existing.badgeBgFill,
    ),
    badgeBgColor: parseHexColor(
      formData.get("badgeBgColor"),
      existing.badgeBgColor,
    ),
    badgeBgGradientFrom: parseHexColor(
      formData.get("badgeBgGradientFrom"),
      existing.badgeBgGradientFrom,
    ),
    badgeBgGradientTo: parseHexColor(
      formData.get("badgeBgGradientTo"),
      existing.badgeBgGradientTo,
    ),
    badgeBgGradientAngle: parseGradientAngle(
      formData.get("badgeBgGradientAngle") ?? existing.badgeBgGradientAngle,
      existing.badgeBgGradientAngle,
    ),
    selectedSponsorIds,
    sponsors: existing.sponsors,
  };

  return badgeConfigSchema.parse(next);
}

export async function updateBadgeSettings(
  orgSlug: string,
  eventId: string,
  formData: FormData,
) {
  return runAction(async () => {
    const ctx = await requireEvent(orgSlug, eventId, "event.update");
    const event = await prisma.event.findFirst({
      where: { id: eventId, organisationId: ctx.organisation.id },
      select: { settings: { select: { badgeConfig: true } } },
    });
    const existing = parseBadgeConfig(event?.settings?.badgeConfig);
    const config = parseSettingsForm(formData, existing);

    if (!BADGE_TEMPLATE_IDS.includes(config.templateId)) {
      throw new Error("Invalid badge template.");
    }

    await saveBadgeConfig(ctx.organisation.id, eventId, config);

    await writeAudit({
      organisationId: ctx.organisation.id,
      eventId,
      userId: ctx.user.id,
      action: "badge.settings_update",
      resource: "event_settings",
      resourceId: eventId,
      metadata: {
        templateId: config.templateId,
        designId: config.designId,
        sponsors: config.selectedSponsorIds.length,
      },
    });

    for (const path of badgePaths(orgSlug, eventId)) {
      revalidatePath(path);
    }

    return { config };
  }, "Could not save badge settings.");
}

export async function uploadEventLogoAction(
  orgSlug: string,
  eventId: string,
  formData: FormData,
) {
  return runAction(async () => {
    const ctx = await requireEvent(orgSlug, eventId, "event.update");
    const file = formData.get("logo");
    if (!(file instanceof File) || file.size === 0) {
      throw new Error("Choose a logo file to upload.");
    }

    const { url } = await uploadEventLogo({
      organisationId: ctx.organisation.id,
      eventId,
      file,
    });

    await writeAudit({
      organisationId: ctx.organisation.id,
      eventId,
      userId: ctx.user.id,
      action: "badge.logo_upload",
      resource: "event",
      resourceId: eventId,
    });

    for (const path of badgePaths(orgSlug, eventId)) {
      revalidatePath(path);
    }

    return { url };
  }, "Could not upload logo.");
}

export async function removeEventLogoAction(orgSlug: string, eventId: string) {
  return runAction(async () => {
    const ctx = await requireEvent(orgSlug, eventId, "event.update");
    await removeEventLogo(ctx.organisation.id, eventId);

    await writeAudit({
      organisationId: ctx.organisation.id,
      eventId,
      userId: ctx.user.id,
      action: "badge.logo_remove",
      resource: "event",
      resourceId: eventId,
    });

    for (const path of badgePaths(orgSlug, eventId)) {
      revalidatePath(path);
    }

    return { ok: true };
  }, "Could not remove logo.");
}

export async function uploadSponsorLogoAction(
  orgSlug: string,
  eventId: string,
  formData: FormData,
) {
  return runAction(async () => {
    const ctx = await requireEvent(orgSlug, eventId, "event.update");
    const file = formData.get("logo");
    if (!(file instanceof File) || file.size === 0) {
      throw new Error("Choose a sponsor logo to upload.");
    }
    const name = String(formData.get("name") ?? "").trim() || "Sponsor";

    const { url } = await uploadEventAssetImage({
      organisationId: ctx.organisation.id,
      eventId,
      file,
      pathnameSuffix: "sponsors/logo",
    });

    const event = await prisma.event.findFirst({
      where: { id: eventId, organisationId: ctx.organisation.id },
      select: { settings: { select: { badgeConfig: true } } },
    });
    const existing = parseBadgeConfig(event?.settings?.badgeConfig);
    if (existing.sponsors.length >= 20) {
      throw new Error("You can upload up to 20 sponsor logos.");
    }

    const sponsor: BadgeSponsor = {
      id: newSponsorId(),
      name: name.slice(0, 80),
      url,
    };

    const config: BadgeConfig = {
      ...existing,
      sponsors: [...existing.sponsors, sponsor],
      selectedSponsorIds: [...existing.selectedSponsorIds, sponsor.id].slice(
        0,
        8,
      ),
    };

    await saveBadgeConfig(ctx.organisation.id, eventId, config);

    await writeAudit({
      organisationId: ctx.organisation.id,
      eventId,
      userId: ctx.user.id,
      action: "badge.sponsor_upload",
      resource: "event",
      resourceId: eventId,
      metadata: { sponsorId: sponsor.id },
    });

    for (const path of badgePaths(orgSlug, eventId)) {
      revalidatePath(path);
    }

    return { sponsor };
  }, "Could not upload sponsor logo.");
}

export async function removeSponsorLogoAction(
  orgSlug: string,
  eventId: string,
  sponsorId: string,
) {
  return runAction(async () => {
    const ctx = await requireEvent(orgSlug, eventId, "event.update");
    const event = await prisma.event.findFirst({
      where: { id: eventId, organisationId: ctx.organisation.id },
      select: { settings: { select: { badgeConfig: true } } },
    });
    const existing = parseBadgeConfig(event?.settings?.badgeConfig);
    const config: BadgeConfig = {
      ...existing,
      sponsors: existing.sponsors.filter((s) => s.id !== sponsorId),
      selectedSponsorIds: existing.selectedSponsorIds.filter(
        (id) => id !== sponsorId,
      ),
    };

    await saveBadgeConfig(ctx.organisation.id, eventId, config);

    await writeAudit({
      organisationId: ctx.organisation.id,
      eventId,
      userId: ctx.user.id,
      action: "badge.sponsor_remove",
      resource: "event",
      resourceId: eventId,
      metadata: { sponsorId },
    });

    for (const path of badgePaths(orgSlug, eventId)) {
      revalidatePath(path);
    }

    return { ok: true };
  }, "Could not remove sponsor logo.");
}

export async function markBadgePrinted(
  orgSlug: string,
  eventId: string,
  attendeeId: string,
) {
  return runAction(async () => {
    const ctx = await requireEvent(orgSlug, eventId, "checkin.perform");
    const payload = await loadBadgePrintPayload(
      ctx.organisation.id,
      eventId,
      attendeeId,
    );
    if (!payload) {
      throw new Error("This attendee does not have a check-in code yet.");
    }

    const badge = await ensureBadgeRecord({
      organisationId: ctx.organisation.id,
      eventId,
      attendeeId,
      templateId: payload.config.templateId,
      printedByUserId: ctx.user.id,
    });

    await writeAudit({
      organisationId: ctx.organisation.id,
      eventId,
      userId: ctx.user.id,
      action: "badge.print",
      resource: "badge",
      resourceId: badge.id,
      metadata: { attendeeId, templateId: payload.config.templateId },
    });

    revalidatePath(`/app/${orgSlug}/events/${eventId}/badges`);
    revalidatePath(`/app/${orgSlug}/events/${eventId}/day/badges`);
    return { badgeId: badge.id };
  }, "Could not record badge print.");
}

const bulkPrintSchema = z.object({
  attendeeIds: z.array(z.string().min(1)).min(1).max(200),
});

export async function markBadgesPrintedBulk(
  orgSlug: string,
  eventId: string,
  attendeeIds: string[],
) {
  return runAction(async () => {
    const ctx = await requireEvent(orgSlug, eventId, "checkin.perform");
    const parsed = bulkPrintSchema.parse({ attendeeIds });
    const event = await prisma.event.findFirst({
      where: { id: eventId, organisationId: ctx.organisation.id },
      select: { settings: { select: { badgeConfig: true } } },
    });
    const config = parseBadgeConfig(event?.settings?.badgeConfig);

    let printed = 0;
    for (const attendeeId of parsed.attendeeIds) {
      const payload = await loadBadgePrintPayload(
        ctx.organisation.id,
        eventId,
        attendeeId,
      );
      if (!payload) continue;

      await ensureBadgeRecord({
        organisationId: ctx.organisation.id,
        eventId,
        attendeeId,
        templateId: config.templateId,
        printedByUserId: ctx.user.id,
      });
      printed++;
    }

    await writeAudit({
      organisationId: ctx.organisation.id,
      eventId,
      userId: ctx.user.id,
      action: "badge.print_bulk",
      resource: "event",
      resourceId: eventId,
      metadata: { count: printed },
    });

    revalidatePath(`/app/${orgSlug}/events/${eventId}/badges`);
    revalidatePath(`/app/${orgSlug}/events/${eventId}/day/badges`);
    return { printed };
  }, "Could not record bulk print.");
}

const attendeeIdSchema = z.object({
  attendeeId: z.string().min(1),
});

/**
 * Invalidate the current badge QR (entrance will deny it) and re-queue for reprint.
 * Does not open the print dialog — staff prints from the queue next.
 */
export async function invalidateBadgeAndRequeue(
  orgSlug: string,
  eventId: string,
  attendeeId: string,
) {
  return runAction(async () => {
    const ctx = await requireEvent(orgSlug, eventId, "checkin.perform");
    const parsed = attendeeIdSchema.parse({ attendeeId });

    const attendee = await prisma.attendee.findFirst({
      where: {
        id: parsed.attendeeId,
        eventId,
        organisationId: ctx.organisation.id,
      },
      select: { id: true },
    });
    if (!attendee) throw new Error("Attendee not found.");

    const { invalidateAndRequeueBadge } = await import("./queue");
    const result = await invalidateAndRequeueBadge({
      organisationId: ctx.organisation.id,
      eventId,
      attendeeId: attendee.id,
      issuedByUserId: ctx.user.id,
    });

    for (const path of badgePaths(orgSlug, eventId)) {
      revalidatePath(path);
    }

    return result;
  }, "Could not invalidate badge.");
}
