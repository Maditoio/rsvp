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
import { getAppUrl } from "@/lib/utils";
import { urlQrDataUrl } from "@/lib/qr";
import { isMapPoiCategory } from "@/modules/venue/categories";
import { uploadFloorPlanImage } from "@/modules/venue/upload";

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

    const plan = await prisma.venueFloorPlan.create({
      data: {
        organisationId: ctx.organisation.id,
        eventId,
        name,
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
    });

    revalidatePath(venuePath(orgSlug, eventId));
    return actionOk({ floorPlanId: plan.id });
  } catch (error) {
    return actionFail(publicActionError(error, "Could not upload floor plan."));
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
  input: { label: string; poiId?: string | null },
): Promise<ActionResult<{ id: string; url: string; qrDataUrl: string }>> {
  try {
    const ctx = await requireEvent(orgSlug, eventId, "event.update");
    const label = input.label.trim();
    if (!label) return actionFail("Checkpoint label is required.");

    const plan = await prisma.venueFloorPlan.findFirst({
      where: {
        id: floorPlanId,
        eventId,
        organisationId: ctx.organisation.id,
      },
    });
    if (!plan) return actionFail("Floor plan not found.");

    if (input.poiId) {
      const poi = await prisma.mapPoi.findFirst({
        where: {
          id: input.poiId,
          floorPlanId,
          organisationId: ctx.organisation.id,
        },
      });
      if (!poi) return actionFail("Location not found.");
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
    });
  } catch (error) {
    return actionFail(publicActionError(error, "Could not create checkpoint."));
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
