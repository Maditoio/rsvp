"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/authz/require";
import { hashToken } from "@/lib/crypto/tokens";
import { rateLimit } from "@/lib/rate-limit";
import { actionFail, actionOk, publicActionError, type ActionResult } from "@/lib/action-result";

export async function resolveVenueCheckpoint(rawToken: string): Promise<
  ActionResult<{ eventId: string; floorPlanId: string; poiId: string | null }>
> {
  try {
    const limited = await rateLimit(
      `venue-qr:${rawToken.slice(0, 16)}`,
      40,
      60,
    );
    if (!limited.success) {
      return actionFail("Too many scans. Please wait a moment.");
    }

    const user = await requireUser();
    const tokenHash = hashToken(rawToken.trim());
    const checkpoint = await prisma.mapCheckpoint.findFirst({
      where: { tokenHash, active: true },
      include: {
        floorPlan: { select: { id: true, publishedAt: true, eventId: true } },
      },
    });
    if (!checkpoint || !checkpoint.floorPlan.publishedAt) {
      return actionFail("This venue QR is invalid or no longer active.");
    }

    const attendee = await prisma.attendee.findFirst({
      where: {
        eventId: checkpoint.eventId,
        userId: user.id,
        organisationId: checkpoint.organisationId,
      },
    });
    if (!attendee) {
      return actionFail(
        "Sign in with the email you registered with for this event, then scan again.",
      );
    }

    await prisma.attendeeMapLocation.upsert({
      where: { attendeeId: attendee.id },
      create: {
        organisationId: checkpoint.organisationId,
        eventId: checkpoint.eventId,
        attendeeId: attendee.id,
        floorPlanId: checkpoint.floorPlanId,
        poiId: checkpoint.poiId,
        checkpointId: checkpoint.id,
      },
      update: {
        floorPlanId: checkpoint.floorPlanId,
        poiId: checkpoint.poiId,
        checkpointId: checkpoint.id,
      },
    });

    return actionOk({
      eventId: checkpoint.eventId,
      floorPlanId: checkpoint.floorPlanId,
      poiId: checkpoint.poiId,
    });
  } catch (error) {
    return actionFail(publicActionError(error, "Could not open venue map."));
  }
}

export async function openVenueCheckpoint(rawToken: string) {
  const result = await resolveVenueCheckpoint(rawToken);
  if (!result.ok) {
    throw new Error(result.error);
  }
  const dest = result.data.poiId
    ? `/me/events/${result.data.eventId}/map?here=${result.data.poiId}`
    : `/me/events/${result.data.eventId}/map`;
  redirect(dest);
}

export async function setAttendeeMapHere(
  eventId: string,
  poiId: string,
): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const attendee = await prisma.attendee.findFirst({
      where: { eventId, userId: user.id },
    });
    if (!attendee) return actionFail("You are not registered for this event.");

    const poi = await prisma.mapPoi.findFirst({
      where: {
        id: poiId,
        eventId,
        organisationId: attendee.organisationId,
        floorPlan: { publishedAt: { not: null } },
      },
    });
    if (!poi) return actionFail("Location not found on the published map.");

    await prisma.attendeeMapLocation.upsert({
      where: { attendeeId: attendee.id },
      create: {
        organisationId: attendee.organisationId,
        eventId,
        attendeeId: attendee.id,
        floorPlanId: poi.floorPlanId,
        poiId: poi.id,
      },
      update: {
        floorPlanId: poi.floorPlanId,
        poiId: poi.id,
        checkpointId: null,
      },
    });

    return actionOk();
  } catch (error) {
    return actionFail(publicActionError(error, "Could not set your location."));
  }
}
