"use server";

import { revalidatePath } from "next/cache";
import type { Prisma } from "@prisma/client";
import { requireEvent } from "@/lib/authz/require";
import { runAction } from "@/lib/action-result";
import { writeAudit } from "@/modules/audit/log";
import { prisma } from "@/lib/db/prisma";
import { uploadEventAssetImage } from "@/modules/files/upload-event-logo";
import {
  eventSiteConfigSchema,
  parseEventSiteConfig,
  parseTemplateId,
  applyTemplateToConfig,
  newSpeakerId,
  type EventSiteConfig,
  type EventSiteSpeaker,
} from "./config";
import { loadEventWebsiteSettings } from "./service";

function websitePaths(orgSlug: string, eventId: string, eventSlug?: string) {
  const paths = [
    `/app/${orgSlug}/events/${eventId}/website`,
    `/app/${orgSlug}/events/${eventId}`,
  ];
  if (eventSlug) {
    paths.push(`/e/${orgSlug}/${eventSlug}`);
  }
  return paths;
}

async function saveWebsiteConfig(
  organisationId: string,
  eventId: string,
  config: EventSiteConfig,
) {
  const json = config as unknown as Prisma.InputJsonValue;
  await prisma.eventSettings.upsert({
    where: { eventId },
    create: {
      organisationId,
      eventId,
      websiteConfig: json,
    },
    update: { websiteConfig: json },
  });
}

export async function saveEventWebsiteConfig(
  orgSlug: string,
  eventId: string,
  configJson: unknown,
) {
  return runAction(async () => {
    const ctx = await requireEvent(orgSlug, eventId, "event.update");
    const parsed = eventSiteConfigSchema.safeParse(configJson);
    if (!parsed.success) {
      throw new Error("Invalid website configuration.");
    }

    const settings = await loadEventWebsiteSettings(
      ctx.organisation.id,
      eventId,
    );
    if (!settings) throw new Error("Event not found.");

    await saveWebsiteConfig(ctx.organisation.id, eventId, parsed.data);

    await writeAudit({
      organisationId: ctx.organisation.id,
      eventId,
      userId: ctx.user.id,
      action: "event.website.draft_saved",
      resource: "event_settings",
      resourceId: eventId,
      metadata: { templateId: parsed.data.templateId },
    });

    for (const path of websitePaths(orgSlug, eventId, settings.event.slug)) {
      revalidatePath(path);
    }

    return { config: parsed.data };
  }, "Could not save website draft.");
}

/** @deprecated Form-based save — prefer saveEventWebsiteConfig */
export async function saveEventWebsiteDraft(
  orgSlug: string,
  eventId: string,
  formData: FormData,
) {
  const raw = formData.get("configJson");
  if (typeof raw === "string" && raw.trim()) {
    try {
      return saveEventWebsiteConfig(orgSlug, eventId, JSON.parse(raw));
    } catch {
      // fall through
    }
  }
  return runAction(async () => {
    throw new Error("Use saveEventWebsiteConfig with JSON payload.");
  }, "Could not save website draft.");
}

export async function publishEventWebsite(orgSlug: string, eventId: string) {
  return runAction(async () => {
    const ctx = await requireEvent(orgSlug, eventId, "event.update");
    const settings = await loadEventWebsiteSettings(
      ctx.organisation.id,
      eventId,
    );
    if (!settings) throw new Error("Event not found.");

    const now = new Date();
    await prisma.eventSettings.upsert({
      where: { eventId },
      create: {
        organisationId: ctx.organisation.id,
        eventId,
        websitePublishedAt: now,
        websiteConfig: settings.config as unknown as Prisma.InputJsonValue,
      },
      update: { websitePublishedAt: now },
    });

    await writeAudit({
      organisationId: ctx.organisation.id,
      eventId,
      userId: ctx.user.id,
      action: "event.website.published",
      resource: "event_settings",
      resourceId: eventId,
    });

    for (const path of websitePaths(orgSlug, eventId, settings.event.slug)) {
      revalidatePath(path);
    }

    return { publishedAt: now.toISOString() };
  }, "Could not publish event website.");
}

export async function unpublishEventWebsite(orgSlug: string, eventId: string) {
  return runAction(async () => {
    const ctx = await requireEvent(orgSlug, eventId, "event.update");
    const event = await prisma.event.findFirst({
      where: { id: eventId, organisationId: ctx.organisation.id },
      select: { slug: true },
    });

    await prisma.eventSettings.updateMany({
      where: { eventId, organisationId: ctx.organisation.id },
      data: { websitePublishedAt: null },
    });

    await writeAudit({
      organisationId: ctx.organisation.id,
      eventId,
      userId: ctx.user.id,
      action: "event.website.unpublished",
      resource: "event_settings",
      resourceId: eventId,
    });

    for (const path of websitePaths(orgSlug, eventId, event?.slug)) {
      revalidatePath(path);
    }

    return undefined;
  }, "Could not unpublish event website.");
}

export async function uploadEventSiteImage(
  orgSlug: string,
  eventId: string,
  formData: FormData,
  purpose:
    | "hero"
    | "speaker"
    | "gallery"
    | "venue"
    | "og"
    | "logo"
    | "about"
    | "section-bg",
) {
  return runAction(async () => {
    const ctx = await requireEvent(orgSlug, eventId, "event.update");
    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) {
      throw new Error("Choose an image to upload.");
    }

    const suffixMap = {
      hero: "website/hero",
      speaker: "website/speakers",
      gallery: "website/gallery",
      venue: "website/venue",
      og: "website/og",
      logo: "website/logo",
      about: "website/about",
      "section-bg": "website/section-bg",
    } as const;

    const { url } = await uploadEventAssetImage({
      organisationId: ctx.organisation.id,
      eventId,
      file,
      pathnameSuffix: suffixMap[purpose],
      kind:
        purpose === "hero" || purpose === "venue" || purpose === "section-bg"
          ? "background"
          : "logo",
    });

    return { url, purpose };
  }, "Could not upload image.");
}

/** @deprecated Use uploadEventSiteImage */
export async function uploadEventSiteHeroImage(
  orgSlug: string,
  eventId: string,
  formData: FormData,
) {
  const result = await uploadEventSiteImage(orgSlug, eventId, formData, "hero");
  if (!result.ok) return result;

  const ctx = await requireEvent(orgSlug, eventId, "event.update");
  const settings = await loadEventWebsiteSettings(
    ctx.organisation.id,
    eventId,
  );
  if (!settings) throw new Error("Event not found.");

  const sections = settings.config.sections.map((s) => {
    if (s.type !== "hero") return s;
    return {
      ...s,
      content: { ...s.content, imageUrl: result.data?.url ?? null },
    };
  });
  const config: EventSiteConfig = { ...settings.config, sections };
  await saveWebsiteConfig(ctx.organisation.id, eventId, config);

  for (const path of websitePaths(orgSlug, eventId, settings.event.slug)) {
    revalidatePath(path);
  }

  return { url: result.data?.url };
}

export async function applyEventSiteTemplate(
  orgSlug: string,
  eventId: string,
  templateId: string,
) {
  return runAction(async () => {
    const ctx = await requireEvent(orgSlug, eventId, "event.update");
    const settings = await loadEventWebsiteSettings(
      ctx.organisation.id,
      eventId,
    );
    if (!settings) throw new Error("Event not found.");

    const id = parseTemplateId(templateId);
    const config = applyTemplateToConfig(settings.config, id);
    await saveWebsiteConfig(ctx.organisation.id, eventId, config);

    for (const path of websitePaths(orgSlug, eventId, settings.event.slug)) {
      revalidatePath(path);
    }

    return { config };
  }, "Could not apply template.");
}

export async function addEventSiteSpeaker(
  orgSlug: string,
  eventId: string,
) {
  return runAction(async () => {
    const ctx = await requireEvent(orgSlug, eventId, "event.update");
    const settings = await loadEventWebsiteSettings(
      ctx.organisation.id,
      eventId,
    );
    if (!settings) throw new Error("Event not found.");

    const speaker: EventSiteSpeaker = {
      id: newSpeakerId(),
      firstName: "New",
      lastName: "Speaker",
      featured: false,
      order: 0,
      hidden: false,
    };

    const sections = settings.config.sections.map((s) => {
      if (s.type !== "speakers") return s;
      const items = (s.content.items as EventSiteSpeaker[]) ?? [];
      return {
        ...s,
        content: { ...s.content, items: [...items, speaker] },
      };
    });

    const config: EventSiteConfig = { ...settings.config, sections };
    await saveWebsiteConfig(ctx.organisation.id, eventId, config);

    return { speaker, config };
  }, "Could not add speaker.");
}

export { parseEventSiteConfig };
