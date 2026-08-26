"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/authz/require";
import { hashToken } from "@/lib/crypto/tokens";
import { rateLimit } from "@/lib/rate-limit";
import { actionFail, actionOk, publicActionError, type ActionResult } from "@/lib/action-result";
import { logMapAnalyticsEvent } from "@/modules/venue/analytics-log";
import { sanitizeMapSearchQuery } from "@/modules/venue/analytics-kinds";

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
        floorPlan: { select: { id: true, publishedAt: true, eventId: true, name: true } },
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

    await logMapAnalyticsEvent({
      organisationId: checkpoint.organisationId,
      eventId: checkpoint.eventId,
      kind: "checkpoint.scan",
      attendeeId: attendee.id,
      userId: user.id,
      floorPlanId: checkpoint.floorPlanId,
      poiId: checkpoint.poiId,
      checkpointId: checkpoint.id,
      metadata: {
        floorName: checkpoint.floorPlan.name,
        source: "qr",
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
    ? `/me/events/${result.data.eventId}/map?here=${result.data.poiId}&floor=${result.data.floorPlanId}`
    : `/me/events/${result.data.eventId}/map?floor=${result.data.floorPlanId}`;
  redirect(dest);
}

export async function setAttendeeMapHere(
  eventId: string,
  poiId: string,
): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const limited = await rateLimit(`map-here:${user.id}:${eventId}`, 30, 60);
    if (!limited.success) {
      return actionFail("Too many updates. Please wait a moment.");
    }

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
      include: { floorPlan: { select: { name: true } } },
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

    await logMapAnalyticsEvent({
      organisationId: attendee.organisationId,
      eventId,
      kind: "map.here",
      attendeeId: attendee.id,
      userId: user.id,
      floorPlanId: poi.floorPlanId,
      poiId: poi.id,
      metadata: {
        floorName: poi.floorPlan.name,
        poiName: poi.name,
        source: "im_here",
      },
    });

    return actionOk();
  } catch (error) {
    return actionFail(publicActionError(error, "Could not set your location."));
  }
}

/**
 * Server-side map search / navigate telemetry. Call when the attendee taps a
 * search hit or Go / View map. Never stores raw tokens.
 */
export async function recordMapInteraction(
  eventId: string,
  input: {
    poiId: string;
    query?: string | null;
    resultCount?: number | null;
    source?: "go" | "view_map" | "search_hit" | "deep_link";
  },
): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const limited = await rateLimit(`map-analytics:${user.id}:${eventId}`, 60, 60);
    if (!limited.success) {
      return actionOk();
    }

    const attendee = await prisma.attendee.findFirst({
      where: { eventId, userId: user.id },
    });
    if (!attendee) return actionFail("You are not registered for this event.");

    const poi = await prisma.mapPoi.findFirst({
      where: {
        id: input.poiId,
        eventId,
        organisationId: attendee.organisationId,
        floorPlan: { publishedAt: { not: null } },
      },
      include: { floorPlan: { select: { name: true } } },
    });
    if (!poi) return actionFail("Location not found on the published map.");

    const query = sanitizeMapSearchQuery(input.query);
    const source = input.source ?? "go";
    const metaBase = {
      floorName: poi.floorPlan.name,
      poiName: poi.name,
      category: poi.category,
      source,
      ...(typeof input.resultCount === "number"
        ? { resultCount: Math.max(0, Math.min(500, Math.floor(input.resultCount))) }
        : {}),
    };

    if (query) {
      await logMapAnalyticsEvent({
        organisationId: attendee.organisationId,
        eventId,
        kind: "map.search",
        attendeeId: attendee.id,
        userId: user.id,
        floorPlanId: poi.floorPlanId,
        poiId: poi.id,
        query,
        metadata: metaBase,
      });
    }

    await logMapAnalyticsEvent({
      organisationId: attendee.organisationId,
      eventId,
      kind: "map.navigate",
      attendeeId: attendee.id,
      userId: user.id,
      floorPlanId: poi.floorPlanId,
      poiId: poi.id,
      metadata: {
        ...metaBase,
        viaSearch: Boolean(query),
      },
    });

    return actionOk();
  } catch (error) {
    return actionFail(publicActionError(error, "Could not record map activity."));
  }
}
