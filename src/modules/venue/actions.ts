"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { requireEvent } from "@/lib/authz/require";
import {
  actionFail,
  actionOk,
  publicActionError,
  type ActionResult,
} from "@/lib/action-result";
import { writeAudit } from "@/modules/audit/log";
import { generateOpaqueToken } from "@/lib/crypto/tokens";
import { encryptSecret, decryptSecret } from "@/lib/crypto/secret";
import { getAppUrl } from "@/lib/utils";
import { urlQrDataUrl } from "@/lib/qr";
import { isMapPoiCategory, mapPoiCategoryLabel, type MapPoiCategory } from "@/modules/venue/categories";
import { uploadFloorPlanImage } from "@/modules/venue/upload";
import {
  detectLocationsFromFloorImage,
  parseStandListCsv,
} from "@/modules/venue/detect";
import type { DetectedPoiProposal } from "@/modules/venue/types";
import { zipSync, strToU8 } from "fflate";
import { labeledQrSheetBytes } from "@/modules/venue/qr-sheet";

function venuePath(orgSlug: string, eventId: string) {
  return `/app/${orgSlug}/events/${eventId}/venue`;
}

export async function createFloorPlanFromUpload(
  orgSlug: string,
  eventId: string,
  formData: FormData,
): Promise<ActionResult<{ floorPlanId: string }>> {
  try {
    const ctx = await requireEvent(orgSlug, eventId, "event.update");
    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) {
      return actionFail("Choose a floor plan image to upload.");
    }
    const name = String(formData.get("name") ?? "Main floor").trim() || "Main floor";
    const { url } = await uploadFloorPlanImage({
      organisationId: ctx.organisation.id,
      eventId,
      file,
    });

    const maxFloor = await prisma.venueFloorPlan.aggregate({
      where: { eventId, organisationId: ctx.organisation.id },
      _max: { floorIndex: true },
    });
    const floorIndex = (maxFloor._max.floorIndex ?? -1) + 1;

    const plan = await prisma.venueFloorPlan.create({
      data: {
        organisationId: ctx.organisation.id,
        eventId,
        name,
        floorIndex,
        imageUrl: url,
      },
    });

    await writeAudit({
      organisationId: ctx.organisation.id,
      eventId,
      userId: ctx.user.id,
      action: "venue.floor_plan.create",
      resource: "venue_floor_plan",
      resourceId: plan.id,
      metadata: { floorIndex, name },
    });

    revalidatePath(venuePath(orgSlug, eventId));
    return actionOk({ floorPlanId: plan.id });
  } catch (error) {
    return actionFail(publicActionError(error, "Could not upload floor plan."));
  }
}

export async function deleteFloorPlan(
  orgSlug: string,
  eventId: string,
  floorPlanId: string,
): Promise<ActionResult> {
  try {
    const ctx = await requireEvent(orgSlug, eventId, "event.update");
    const result = await prisma.venueFloorPlan.deleteMany({
      where: {
        id: floorPlanId,
        eventId,
        organisationId: ctx.organisation.id,
      },
    });
    if (result.count === 0) return actionFail("Floor plan not found.");

    await writeAudit({
      organisationId: ctx.organisation.id,
      eventId,
      userId: ctx.user.id,
      action: "venue.floor_plan.delete",
      resource: "venue_floor_plan",
      resourceId: floorPlanId,
    });

    revalidatePath(venuePath(orgSlug, eventId));
    revalidatePath(`/me/events/${eventId}/map`);
    return actionOk();
  } catch (error) {
    return actionFail(publicActionError(error, "Could not delete floor plan."));
  }
}

const poiSchema = z.object({
  name: z.string().trim().min(1).max(120),
  category: z.string().trim().min(1),
  description: z.string().trim().max(500).optional().nullable(),
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
  meetingRoomId: z.string().cuid().optional().nullable(),
  sessionId: z.string().cuid().optional().nullable(),
});

export async function upsertMapPoi(
  orgSlug: string,
  eventId: string,
  floorPlanId: string,
  input: z.infer<typeof poiSchema> & { id?: string },
): Promise<ActionResult<{ id: string }>> {
  try {
    const ctx = await requireEvent(orgSlug, eventId, "event.update");
    const data = poiSchema.parse(input);
    if (!isMapPoiCategory(data.category)) {
      return actionFail("Unknown location category.");
    }

    const plan = await prisma.venueFloorPlan.findFirst({
      where: {
        id: floorPlanId,
        eventId,
        organisationId: ctx.organisation.id,
      },
    });
    if (!plan) return actionFail("Floor plan not found.");

    if (data.meetingRoomId) {
      const room = await prisma.meetingRoom.findFirst({
        where: {
          id: data.meetingRoomId,
          eventId,
          organisationId: ctx.organisation.id,
        },
      });
      if (!room) return actionFail("Meeting room not found.");
    }
    if (data.sessionId) {
      const session = await prisma.session.findFirst({
        where: {
          id: data.sessionId,
          eventId,
          organisationId: ctx.organisation.id,
        },
      });
      if (!session) return actionFail("Session not found.");
    }

    const payload = {
      name: data.name,
      category: data.category,
      description: data.description || null,
      x: data.x,
      y: data.y,
      meetingRoomId: data.meetingRoomId || null,
      sessionId: data.sessionId || null,
    };

    if (input.id) {
      const owned = await prisma.mapPoi.findFirst({
        where: {
          id: input.id,
          eventId,
          organisationId: ctx.organisation.id,
          floorPlanId,
        },
      });
      if (!owned) return actionFail("Location not found.");
      const poi = await prisma.mapPoi.update({
        where: { id: input.id },
        data: payload,
      });
      revalidatePath(venuePath(orgSlug, eventId));
      revalidatePath(`/me/events/${eventId}/map`);
      return actionOk({ id: poi.id });
    }

    const poi = await prisma.mapPoi.create({
      data: {
        organisationId: ctx.organisation.id,
        eventId,
        floorPlanId,
        ...payload,
      },
    });

    revalidatePath(venuePath(orgSlug, eventId));
    revalidatePath(`/me/events/${eventId}/map`);
    return actionOk({ id: poi.id });
  } catch (error) {
    return actionFail(publicActionError(error, "Could not save location."));
  }
}

export async function deleteMapPoi(
  orgSlug: string,
  eventId: string,
  poiId: string,
): Promise<ActionResult> {
  try {
    const ctx = await requireEvent(orgSlug, eventId, "event.update");
    const result = await prisma.mapPoi.deleteMany({
      where: {
        id: poiId,
        eventId,
        organisationId: ctx.organisation.id,
      },
    });
    if (result.count === 0) return actionFail("Location not found.");
    revalidatePath(venuePath(orgSlug, eventId));
    revalidatePath(`/me/events/${eventId}/map`);
    return actionOk();
  } catch (error) {
    return actionFail(publicActionError(error, "Could not delete location."));
  }
}

export async function createMapCheckpoint(
  orgSlug: string,
  eventId: string,
  floorPlanId: string,
  input: { label?: string | null; poiId?: string | null },
): Promise<ActionResult<{ id: string; url: string; qrDataUrl: string; label: string }>> {
  try {
    const ctx = await requireEvent(orgSlug, eventId, "event.update");

    const plan = await prisma.venueFloorPlan.findFirst({
      where: {
        id: floorPlanId,
        eventId,
        organisationId: ctx.organisation.id,
      },
    });
    if (!plan) return actionFail("Floor plan not found.");

    let poiName: string | null = null;
    let poiCategory: string | null = null;
    if (input.poiId) {
      const poi = await prisma.mapPoi.findFirst({
        where: {
          id: input.poiId,
          floorPlanId,
          organisationId: ctx.organisation.id,
        },
      });
      if (!poi) return actionFail("Location not found.");
      poiName = poi.name;
      poiCategory = poi.category;
    }

    let label = (input.label ?? "").trim();
    if (!label && poiName) label = poiName;
    if (!label && poiCategory) label = mapPoiCategoryLabel(poiCategory);
    if (!label) {
      return actionFail("Select a location or enter a print label.");
    }

    const token = generateOpaqueToken();
    const checkpoint = await prisma.mapCheckpoint.create({
      data: {
        organisationId: ctx.organisation.id,
        eventId,
        floorPlanId,
        poiId: input.poiId || null,
        label,
        tokenHash: token.hash,
        tokenEncrypted: encryptSecret(token.raw),
      },
    });

    await writeAudit({
      organisationId: ctx.organisation.id,
      eventId,
      userId: ctx.user.id,
      action: "venue.checkpoint.create",
      resource: "map_checkpoint",
      resourceId: checkpoint.id,
    });

    const url = `${getAppUrl()}/v/${token.raw}`;
    const qrDataUrl = await urlQrDataUrl(url, { width: 200 });

    revalidatePath(venuePath(orgSlug, eventId));
    return actionOk({
      id: checkpoint.id,
      url,
      qrDataUrl,
      label,
    });
  } catch (error) {
    return actionFail(publicActionError(error, "Could not create checkpoint."));
  }
}

function slugFilename(label: string, index: number) {
  const base = label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
  return `${String(index + 1).padStart(2, "0")}-${base || "checkpoint"}.svg`;
}

export async function downloadFloorCheckpointQrZip(
  orgSlug: string,
  eventId: string,
  floorPlanId: string,
): Promise<
  ActionResult<{
    fileName: string;
    base64: string;
    included: number;
    skipped: number;
  }>
> {
  try {
    const ctx = await requireEvent(orgSlug, eventId, "event.update");
    const plan = await prisma.venueFloorPlan.findFirst({
      where: {
        id: floorPlanId,
        eventId,
        organisationId: ctx.organisation.id,
      },
      select: { id: true, name: true },
    });
    if (!plan) return actionFail("Floor plan not found.");

    const checkpoints = await prisma.mapCheckpoint.findMany({
      where: {
        floorPlanId,
        eventId,
        organisationId: ctx.organisation.id,
        active: true,
      },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        label: true,
        tokenEncrypted: true,
      },
    });

    if (checkpoints.length === 0) {
      return actionFail("No active QR checkpoints on this floor.");
    }

    const files: Record<string, Uint8Array> = {};
    let included = 0;
    let skipped = 0;
    const indexRows = ["label,filename,url"];

    for (let i = 0; i < checkpoints.length; i++) {
      const cp = checkpoints[i]!;
      if (!cp.tokenEncrypted) {
        skipped += 1;
        continue;
      }
      let raw: string;
      try {
        raw = decryptSecret(cp.tokenEncrypted);
      } catch {
        skipped += 1;
        continue;
      }
      const url = `${getAppUrl()}/v/${raw}`;
      const qrDataUrl = await urlQrDataUrl(url, { width: 400 });
      const fileName = slugFilename(cp.label, included);
      files[fileName] = labeledQrSheetBytes({
        label: cp.label,
        qrPngDataUrl: qrDataUrl,
        floorName: plan.name,
      });
      indexRows.push(
        `"${cp.label.replace(/"/g, '""')}",${fileName},${url}`,
      );
      included += 1;
    }

    if (included === 0) {
      return actionFail(
        skipped > 0
          ? "Existing QRs were created before reprint support. Generate new checkpoints, then download again."
          : "No QR checkpoints available to download.",
      );
    }

    files["index.csv"] = strToU8(indexRows.join("\n"));
    files["README.txt"] = strToU8(
      [
        "Venue QR print sheets",
        "",
        "Each .svg file is a printable card:",
        "  - Location label at the top",
        "  - QR code in the centre",
        "  - Floor name at the bottom",
        "",
        "Open in a browser or Illustrator/Inkscape, then print.",
        "index.csv lists every file and its scan URL.",
      ].join("\n"),
    );
    const zipped = zipSync(files, { level: 6 });
    const floorSlug = plan.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 40);
    const fileName = `${floorSlug || "floor"}-qr-print-sheets.zip`;

    await writeAudit({
      organisationId: ctx.organisation.id,
      eventId,
      userId: ctx.user.id,
      action: "venue.checkpoint.zip_download",
      resource: "venue_floor_plan",
      resourceId: floorPlanId,
      metadata: { included, skipped },
    });

    return actionOk({
      fileName,
      base64: Buffer.from(zipped).toString("base64"),
      included,
      skipped,
    });
  } catch (error) {
    return actionFail(
      publicActionError(error, "Could not build QR zip download."),
    );
  }
}

export async function disableMapCheckpoint(
  orgSlug: string,
  eventId: string,
  checkpointId: string,
): Promise<ActionResult> {
  try {
    const ctx = await requireEvent(orgSlug, eventId, "event.update");
    const result = await prisma.mapCheckpoint.updateMany({
      where: {
        id: checkpointId,
        eventId,
        organisationId: ctx.organisation.id,
        active: true,
      },
      data: { active: false, disabledAt: new Date() },
    });
    if (result.count === 0) return actionFail("Checkpoint not found.");
    revalidatePath(venuePath(orgSlug, eventId));
    return actionOk();
  } catch (error) {
    return actionFail(publicActionError(error, "Could not disable checkpoint."));
  }
}

export async function setFloorPlanPublished(
  orgSlug: string,
  eventId: string,
  floorPlanId: string,
  publish: boolean,
): Promise<ActionResult> {
  try {
    const ctx = await requireEvent(orgSlug, eventId, "event.update");
    const plan = await prisma.venueFloorPlan.findFirst({
      where: {
        id: floorPlanId,
        eventId,
        organisationId: ctx.organisation.id,
      },
    });
    if (!plan) return actionFail("Floor plan not found.");

    await prisma.venueFloorPlan.update({
      where: { id: floorPlanId },
      data: { publishedAt: publish ? new Date() : null },
    });

    await writeAudit({
      organisationId: ctx.organisation.id,
      eventId,
      userId: ctx.user.id,
      action: publish ? "venue.floor_plan.publish" : "venue.floor_plan.unpublish",
      resource: "venue_floor_plan",
      resourceId: floorPlanId,
    });

    revalidatePath(venuePath(orgSlug, eventId));
    revalidatePath(`/me/events/${eventId}/map`);
    return actionOk();
  } catch (error) {
    return actionFail(publicActionError(error, "Could not update publish state."));
  }
}

export async function detectFloorPlanLocations(
  orgSlug: string,
  eventId: string,
  floorPlanId: string,
  formData?: FormData,
): Promise<
  ActionResult<{
    proposals: DetectedPoiProposal[];
    model: string;
    matchedStandListCount: number;
  }>
> {
  try {
    const ctx = await requireEvent(orgSlug, eventId, "event.update");
    if (!ctx.organisation.venueAiFloorPlanEnabled) {
      return actionFail("Con·cierge floor mapping is not enabled for this organisation.");
    }

    const plan = await prisma.venueFloorPlan.findFirst({
      where: {
        id: floorPlanId,
        eventId,
        organisationId: ctx.organisation.id,
      },
      include: {
        pois: { select: { name: true, x: true, y: true } },
      },
    });
    if (!plan) return actionFail("Floor plan not found.");

    let standList:
      | { standCode: string; name: string; category: MapPoiCategory | null }[]
      | undefined;
    const listFile = formData?.get("standList");
    if (listFile instanceof File && listFile.size > 0) {
      if (listFile.size > 2 * 1024 * 1024) {
        return actionFail("Stand list must be 2 MB or smaller.");
      }
      const type = listFile.type || "";
      const name = listFile.name.toLowerCase();
      if (
        type.includes("csv") ||
        type.includes("text") ||
        name.endsWith(".csv") ||
        name.endsWith(".txt") ||
        type === ""
      ) {
        const text = await listFile.text();
        standList = parseStandListCsv(text);
      } else {
        return actionFail("Stand list must be a CSV or plain text file.");
      }
    }

    const { proposals: raw, model } = await detectLocationsFromFloorImage({
      imageUrl: plan.imageUrl,
      standList,
    });

    const proposals = raw.filter((p) => {
      const nameKey = p.name.toLowerCase();
      return !plan.pois.some((existing) => {
        const sameName = existing.name.toLowerCase() === nameKey;
        const near = Math.hypot(existing.x - p.x, existing.y - p.y) < 0.02;
        return sameName || near;
      });
    });

    await writeAudit({
      organisationId: ctx.organisation.id,
      eventId,
      userId: ctx.user.id,
      action: "venue.floor_plan.detect",
      resource: "venue_floor_plan",
      resourceId: floorPlanId,
      metadata: {
        model,
        proposed: proposals.length,
        standListRows: standList?.length ?? 0,
      },
    });

    return actionOk({
      proposals,
      model,
      matchedStandListCount: standList?.length ?? 0,
    });
  } catch (error) {
    return actionFail(
      publicActionError(error, "Con·cierge could not read this floor plan."),
    );
  }
}

const acceptSchema = z.object({
  proposals: z
    .array(
      z.object({
        name: z.string().trim().min(1).max(120),
        category: z.string().trim().min(1),
        x: z.number().min(0).max(1),
        y: z.number().min(0).max(1),
        standCode: z.string().trim().max(40).optional().nullable(),
      }),
    )
    .min(1)
    .max(400),
});

export async function acceptDetectedPois(
  orgSlug: string,
  eventId: string,
  floorPlanId: string,
  input: z.infer<typeof acceptSchema>,
): Promise<ActionResult<{ created: number }>> {
  try {
    const ctx = await requireEvent(orgSlug, eventId, "event.update");
    if (!ctx.organisation.venueAiFloorPlanEnabled) {
      return actionFail("Con·cierge floor mapping is not enabled for this organisation.");
    }

    const data = acceptSchema.parse(input);
    const plan = await prisma.venueFloorPlan.findFirst({
      where: {
        id: floorPlanId,
        eventId,
        organisationId: ctx.organisation.id,
      },
    });
    if (!plan) return actionFail("Floor plan not found.");

    const rows = data.proposals
      .filter((p) => isMapPoiCategory(p.category))
      .map((p, index) => ({
        organisationId: ctx.organisation.id,
        eventId,
        floorPlanId,
        name: p.name,
        category: p.category,
        description: p.standCode ? `Stand ${p.standCode}` : null,
        x: p.x,
        y: p.y,
        sortOrder: index,
      }));

    if (rows.length === 0) {
      return actionFail("No valid locations to add.");
    }

    const result = await prisma.mapPoi.createMany({ data: rows });

    await writeAudit({
      organisationId: ctx.organisation.id,
      eventId,
      userId: ctx.user.id,
      action: "venue.floor_plan.detect.accept",
      resource: "venue_floor_plan",
      resourceId: floorPlanId,
      metadata: { created: result.count },
    });

    revalidatePath(venuePath(orgSlug, eventId));
    revalidatePath(`/me/events/${eventId}/map`);
    return actionOk({ created: result.count });
  } catch (error) {
    return actionFail(publicActionError(error, "Could not save detected locations."));
  }
}
