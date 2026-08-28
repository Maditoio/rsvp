"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { requireEvent } from "@/lib/authz/require";
import { runAction } from "@/lib/action-result";
import { writeAudit } from "@/modules/audit/log";
import { uploadEventAssetImage } from "@/modules/files/upload-event-logo";
import { parseBadgeConfig } from "@/modules/badges/config";
import type { Prisma } from "@prisma/client";
import {
  createSponsorSchema,
  deriveSponsorNameFromFilename,
  parseSponsorTier,
  updateSponsorSchema,
} from "./config";
import { nextSortOrderInTier } from "./service";

function sponsorPaths(orgSlug: string, eventId: string) {
  return [
    `/app/${orgSlug}/events/${eventId}/sponsors`,
    `/app/${orgSlug}/events/${eventId}/settings`,
    `/app/${orgSlug}/events/${eventId}/website`,
    `/app/${orgSlug}/events/${eventId}/badges`,
    `/app/${orgSlug}/events/${eventId}/day/badges`,
  ];
}

async function revalidateSponsorPaths(orgSlug: string, eventId: string) {
  for (const path of sponsorPaths(orgSlug, eventId)) {
    revalidatePath(path);
  }
}

async function ensureSelectedSponsorIds(
  organisationId: string,
  eventId: string,
  sponsorId: string,
  select: boolean,
) {
  const event = await prisma.event.findFirst({
    where: { id: eventId, organisationId },
    select: { settings: { select: { badgeConfig: true } } },
  });
  const config = parseBadgeConfig(event?.settings?.badgeConfig);
  const ids = new Set(config.selectedSponsorIds);

  if (select) {
    ids.add(sponsorId);
  } else {
    ids.delete(sponsorId);
  }

  const nextIds = [...ids].slice(0, 8);
  const json = {
    ...config,
    selectedSponsorIds: nextIds,
  } as unknown as Prisma.InputJsonValue;

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

export async function createEventSponsorAction(
  orgSlug: string,
  eventId: string,
  formData: FormData,
) {
  return runAction(async () => {
    const ctx = await requireEvent(orgSlug, eventId, "event.update");
    const input = createSponsorSchema.parse({
      name: formData.get("name"),
      tier: formData.get("tier"),
      websiteUrl: formData.get("websiteUrl"),
    });

    const logoFilename = String(formData.get("logoFilename") ?? "").trim();
    const name =
      input.name ??
      deriveSponsorNameFromFilename(logoFilename) ??
      "Partner";

    const count = await prisma.eventSponsor.count({
      where: { organisationId: ctx.organisation.id, eventId },
    });
    if (count >= 50) {
      throw new Error("You can add up to 50 sponsors per event.");
    }

    const sortOrder = await nextSortOrderInTier(
      ctx.organisation.id,
      eventId,
      input.tier,
    );

    const sponsor = await prisma.eventSponsor.create({
      data: {
        organisationId: ctx.organisation.id,
        eventId,
        name,
        tier: input.tier,
        websiteUrl: input.websiteUrl,
        sortOrder,
      },
      select: { id: true, name: true, tier: true },
    });

    await writeAudit({
      organisationId: ctx.organisation.id,
      eventId,
      userId: ctx.user.id,
      action: "sponsor.create",
      resource: "event_sponsor",
      resourceId: sponsor.id,
      metadata: { name: sponsor.name, tier: sponsor.tier },
    });

    await revalidateSponsorPaths(orgSlug, eventId);
    return { sponsor };
  }, "Could not add sponsor.");
}

export async function updateEventSponsorAction(
  orgSlug: string,
  eventId: string,
  formData: FormData,
) {
  return runAction(async () => {
    const ctx = await requireEvent(orgSlug, eventId, "event.update");
    const input = updateSponsorSchema.parse({
      id: formData.get("id"),
      name: formData.get("name"),
      tier: formData.get("tier"),
      websiteUrl: formData.get("websiteUrl"),
    });

    const existing = await prisma.eventSponsor.findFirst({
      where: {
        id: input.id,
        eventId,
        organisationId: ctx.organisation.id,
      },
    });
    if (!existing) throw new Error("Sponsor not found.");

    let sortOrder = existing.sortOrder;
    if (existing.tier !== input.tier) {
      sortOrder = await nextSortOrderInTier(
        ctx.organisation.id,
        eventId,
        input.tier,
      );
    }

    const sponsor = await prisma.eventSponsor.update({
      where: { id: input.id },
      data: {
        name: input.name ?? existing.name,
        tier: input.tier,
        websiteUrl: input.websiteUrl,
        sortOrder,
      },
      select: { id: true, name: true, tier: true },
    });

    await writeAudit({
      organisationId: ctx.organisation.id,
      eventId,
      userId: ctx.user.id,
      action: "sponsor.update",
      resource: "event_sponsor",
      resourceId: sponsor.id,
    });

    await revalidateSponsorPaths(orgSlug, eventId);
    return { sponsor };
  }, "Could not update sponsor.");
}

export async function deleteEventSponsorAction(
  orgSlug: string,
  eventId: string,
  sponsorId: string,
) {
  return runAction(async () => {
    const ctx = await requireEvent(orgSlug, eventId, "event.update");
    const existing = await prisma.eventSponsor.findFirst({
      where: {
        id: sponsorId,
        eventId,
        organisationId: ctx.organisation.id,
      },
    });
    if (!existing) throw new Error("Sponsor not found.");

    await prisma.eventSponsor.delete({ where: { id: sponsorId } });
    await ensureSelectedSponsorIds(
      ctx.organisation.id,
      eventId,
      sponsorId,
      false,
    );

    await writeAudit({
      organisationId: ctx.organisation.id,
      eventId,
      userId: ctx.user.id,
      action: "sponsor.delete",
      resource: "event_sponsor",
      resourceId: sponsorId,
      metadata: { name: existing.name },
    });

    await revalidateSponsorPaths(orgSlug, eventId);
    return { ok: true as const };
  }, "Could not remove sponsor.");
}

export async function reorderEventSponsorAction(
  orgSlug: string,
  eventId: string,
  sponsorId: string,
  direction: "up" | "down",
) {
  return runAction(async () => {
    const ctx = await requireEvent(orgSlug, eventId, "event.update");
    const sponsor = await prisma.eventSponsor.findFirst({
      where: {
        id: sponsorId,
        eventId,
        organisationId: ctx.organisation.id,
      },
    });
    if (!sponsor) throw new Error("Sponsor not found.");

    const siblings = await prisma.eventSponsor.findMany({
      where: {
        organisationId: ctx.organisation.id,
        eventId,
        tier: sponsor.tier,
      },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, sortOrder: true },
    });

    const index = siblings.findIndex((s) => s.id === sponsorId);
    const swapIndex = direction === "up" ? index - 1 : index + 1;
    const swap = siblings[swapIndex];
    if (!swap || index < 0) return { ok: true as const };

    await prisma.$transaction([
      prisma.eventSponsor.update({
        where: { id: sponsor.id },
        data: { sortOrder: swap.sortOrder },
      }),
      prisma.eventSponsor.update({
        where: { id: swap.id },
        data: { sortOrder: sponsor.sortOrder },
      }),
    ]);

    await revalidateSponsorPaths(orgSlug, eventId);
    return { ok: true as const };
  }, "Could not reorder sponsor.");
}

export async function uploadEventSponsorLogoAction(
  orgSlug: string,
  eventId: string,
  formData: FormData,
) {
  return runAction(async () => {
    const ctx = await requireEvent(orgSlug, eventId, "event.update");
    const sponsorId = String(formData.get("sponsorId") ?? "").trim();
    if (!sponsorId) throw new Error("Sponsor is required.");

    const file = formData.get("logo");
    if (!(file instanceof File) || file.size === 0) {
      throw new Error("Choose a logo to upload.");
    }

    const sponsor = await prisma.eventSponsor.findFirst({
      where: {
        id: sponsorId,
        eventId,
        organisationId: ctx.organisation.id,
      },
    });
    if (!sponsor) throw new Error("Sponsor not found.");

    const { url } = await uploadEventAssetImage({
      organisationId: ctx.organisation.id,
      eventId,
      file,
      pathnameSuffix: `sponsors/${sponsorId}`,
    });

    await prisma.eventSponsor.update({
      where: { id: sponsorId },
      data: { logoUrl: url },
    });

    await writeAudit({
      organisationId: ctx.organisation.id,
      eventId,
      userId: ctx.user.id,
      action: "sponsor.logo_upload",
      resource: "event_sponsor",
      resourceId: sponsorId,
    });

    await revalidateSponsorPaths(orgSlug, eventId);
    return { url };
  }, "Could not upload sponsor logo.");
}

export async function removeEventSponsorLogoAction(
  orgSlug: string,
  eventId: string,
  sponsorId: string,
) {
  return runAction(async () => {
    const ctx = await requireEvent(orgSlug, eventId, "event.update");
    const sponsor = await prisma.eventSponsor.findFirst({
      where: {
        id: sponsorId,
        eventId,
        organisationId: ctx.organisation.id,
      },
    });
    if (!sponsor) throw new Error("Sponsor not found.");

    await prisma.eventSponsor.update({
      where: { id: sponsorId },
      data: { logoUrl: null },
    });

    await ensureSelectedSponsorIds(
      ctx.organisation.id,
      eventId,
      sponsorId,
      false,
    );

    await writeAudit({
      organisationId: ctx.organisation.id,
      eventId,
      userId: ctx.user.id,
      action: "sponsor.logo_remove",
      resource: "event_sponsor",
      resourceId: sponsorId,
    });

    await revalidateSponsorPaths(orgSlug, eventId);
    return { ok: true as const };
  }, "Could not remove sponsor logo.");
}

/** Create sponsor with logo in one step (badge settings shortcut). */
export async function createEventSponsorWithLogoAction(
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

    const logoFilename = String(formData.get("logoFilename") ?? "").trim();
    const name =
      String(formData.get("name") ?? "").trim() ||
      deriveSponsorNameFromFilename(logoFilename || file.name);
    const tier = parseSponsorTier(formData.get("tier"));

    const count = await prisma.eventSponsor.count({
      where: { organisationId: ctx.organisation.id, eventId },
    });
    if (count >= 50) {
      throw new Error("You can add up to 50 sponsors per event.");
    }

    const sortOrder = await nextSortOrderInTier(
      ctx.organisation.id,
      eventId,
      tier,
    );

    const sponsor = await prisma.eventSponsor.create({
      data: {
        organisationId: ctx.organisation.id,
        eventId,
        name: name.slice(0, 80),
        tier,
        sortOrder,
      },
    });

    const { url } = await uploadEventAssetImage({
      organisationId: ctx.organisation.id,
      eventId,
      file,
      pathnameSuffix: `sponsors/${sponsor.id}`,
    });

    await prisma.eventSponsor.update({
      where: { id: sponsor.id },
      data: { logoUrl: url },
    });

    await ensureSelectedSponsorIds(
      ctx.organisation.id,
      eventId,
      sponsor.id,
      true,
    );

    await writeAudit({
      organisationId: ctx.organisation.id,
      eventId,
      userId: ctx.user.id,
      action: "sponsor.create",
      resource: "event_sponsor",
      resourceId: sponsor.id,
      metadata: { name: sponsor.name, tier: sponsor.tier, withLogo: true },
    });

    await revalidateSponsorPaths(orgSlug, eventId);
    return { sponsorId: sponsor.id };
  }, "Could not add sponsor logo.");
}

export async function updateBadgeSponsorSelectionAction(
  orgSlug: string,
  eventId: string,
  sponsorIds: string[],
) {
  return runAction(async () => {
    const ctx = await requireEvent(orgSlug, eventId, "event.update");
    const unique = [...new Set(sponsorIds)].slice(0, 8);

    const valid = await prisma.eventSponsor.findMany({
      where: {
        organisationId: ctx.organisation.id,
        eventId,
        id: { in: unique },
        logoUrl: { not: null },
      },
      select: { id: true },
    });
    const validIds = valid.map((s) => s.id);

    const event = await prisma.event.findFirst({
      where: { id: eventId, organisationId: ctx.organisation.id },
      select: { settings: { select: { badgeConfig: true } } },
    });
    const config = parseBadgeConfig(event?.settings?.badgeConfig);
    const json = {
      ...config,
      selectedSponsorIds: validIds,
      sponsors: [],
    } as unknown as Prisma.InputJsonValue;

    await prisma.eventSettings.upsert({
      where: { eventId },
      create: {
        organisationId: ctx.organisation.id,
        eventId,
        badgeConfig: json,
      },
      update: { badgeConfig: json },
    });

    await revalidateSponsorPaths(orgSlug, eventId);
    return { selectedSponsorIds: validIds };
  }, "Could not update badge sponsor selection.");
}
