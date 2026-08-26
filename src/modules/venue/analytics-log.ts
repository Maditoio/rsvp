import "server-only";

import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import {
  isMapAnalyticsKind,
  sanitizeMapSearchQuery,
  type MapAnalyticsKind,
} from "@/modules/venue/analytics-kinds";

type LogMapAnalyticsInput = {
  organisationId: string;
  eventId: string;
  kind: MapAnalyticsKind;
  attendeeId?: string | null;
  userId?: string | null;
  floorPlanId?: string | null;
  poiId?: string | null;
  checkpointId?: string | null;
  query?: string | null;
  metadata?: Prisma.InputJsonValue;
};

/**
 * Fire-and-forget safe write for map telemetry. Never throws to callers —
 * analytics must not break navigation / QR / I'm here.
 */
export async function logMapAnalyticsEvent(
  input: LogMapAnalyticsInput,
): Promise<void> {
  if (!isMapAnalyticsKind(input.kind)) return;
  try {
    await prisma.mapAnalyticsEvent.create({
      data: {
        organisationId: input.organisationId,
        eventId: input.eventId,
        kind: input.kind,
        attendeeId: input.attendeeId ?? null,
        userId: input.userId ?? null,
        floorPlanId: input.floorPlanId ?? null,
        poiId: input.poiId ?? null,
        checkpointId: input.checkpointId ?? null,
        query:
          input.kind === "map.search"
            ? sanitizeMapSearchQuery(input.query)
            : null,
        metadata: input.metadata ?? undefined,
      },
    });
  } catch {
    // Swallow — insights are additive; never block attendee flows.
  }
}
