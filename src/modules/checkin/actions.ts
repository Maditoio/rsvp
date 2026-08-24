"use server";

import { prisma } from "@/lib/db/prisma";
import { requireEvent } from "@/lib/authz/require";
import { hashToken } from "@/lib/crypto/tokens";
import { maskAttendeeForCheckIn } from "@/lib/authz/fields";
import { writeAudit } from "@/modules/audit/log";
import { rateLimit } from "@/lib/rate-limit";
import { revalidatePath } from "next/cache";
import {
  actionFail,
  actionOk,
  publicActionError,
} from "@/lib/action-result";
import type {
  CheckInActionResult,
  CheckInLookupResult,
  CheckInOutcome,
  CheckInSearchResult,
  CheckInSearchRow,
} from "./types";
import {
  enqueueBadgeAfterCheckIn,
  getBadgeQueueInfo,
  type BadgeQueueInfo,
} from "@/modules/badges/queue";

const NOT_FOUND_MESSAGE =
  "No attendee found for this event. Check the QR code or search by name on Lookup.";

function eventDayPaths(orgSlug: string, eventId: string) {
  return [
    `/app/${orgSlug}/events/${eventId}/day`,
    `/app/${orgSlug}/events/${eventId}/day/badges`,
    `/app/${orgSlug}/events/${eventId}/check-in`,
  ];
}

function revalidateCheckIn(orgSlug: string, eventId: string) {
  for (const path of eventDayPaths(orgSlug, eventId)) {
    revalidatePath(path);
  }
}

async function assertScanRateLimit(userId: string) {
  const limited = await rateLimit(`qr:${userId}`, 60, 60);
  if (!limited.success) {
    throw new Error("Too many scans. Please wait a moment and try again.");
  }
}

const attendeeCheckInSelect = {
  id: true,
  firstName: true,
  lastName: true,
  company: true,
  category: { select: { name: true } },
  checkIns: {
    orderBy: { checkedInAt: "desc" as const },
    take: 1,
    select: { checkedInAt: true },
  },
} as const;

async function loadAttendeeByToken(
  organisationId: string,
  eventId: string,
  rawToken: string,
) {
  return prisma.attendee.findFirst({
    where: {
      qrTokenHash: hashToken(rawToken),
      eventId,
      organisationId,
    },
    select: attendeeCheckInSelect,
  });
}

async function loadAttendeeById(
  organisationId: string,
  eventId: string,
  attendeeId: string,
) {
  return prisma.attendee.findFirst({
    where: {
      id: attendeeId,
      eventId,
      organisationId,
    },
    select: attendeeCheckInSelect,
  });
}

async function recordCheckIn(
  ctx: Awaited<ReturnType<typeof requireEvent>> & { eventId: string },
  attendeeId: string,
  options?: { checkedInAt?: Date; offlineClientId?: string },
) {
  await prisma.$transaction(async (tx) => {
    await tx.checkIn.create({
      data: {
        organisationId: ctx.organisation.id,
        eventId: ctx.eventId,
        attendeeId,
        checkedInById: ctx.user.id,
        ...(options?.checkedInAt ? { checkedInAt: options.checkedInAt } : {}),
      },
    });
    await tx.attendee.update({
      where: { id: attendeeId },
      data: { status: "CHECKED_IN" },
    });
  });

  await writeAudit({
    organisationId: ctx.organisation.id,
    eventId: ctx.eventId,
    userId: ctx.user.id,
    action: "checkin.perform",
    resource: "attendee",
    resourceId: attendeeId,
    metadata: options?.offlineClientId
      ? { source: "offline_sync", clientId: options.offlineClientId }
      : undefined,
  });
}

function toSuccess(
  view: ReturnType<typeof maskAttendeeForCheckIn>,
  outcome: CheckInOutcome,
  badgeQueue?: BadgeQueueInfo,
): CheckInActionResult {
  return actionOk({ view, outcome, badgeQueue });
}

export async function lookupCheckIn(
  orgSlug: string,
  eventId: string,
  rawToken: string,
): Promise<CheckInLookupResult> {
  try {
    const ctx = await requireEvent(orgSlug, eventId, "checkin.perform");
    await assertScanRateLimit(ctx.user.id);

    const attendee = await loadAttendeeByToken(
      ctx.organisation.id,
      eventId,
      rawToken,
    );
    if (!attendee) return actionFail(NOT_FOUND_MESSAGE);

    return actionOk(maskAttendeeForCheckIn(attendee));
  } catch (error) {
    return actionFail(publicActionError(error, "Could not look up this attendee."));
  }
}

export async function performCheckIn(
  orgSlug: string,
  eventId: string,
  rawToken: string,
): Promise<CheckInActionResult> {
  try {
    const ctx = await requireEvent(orgSlug, eventId, "checkin.perform");
    await assertScanRateLimit(ctx.user.id);

    const attendee = await loadAttendeeByToken(
      ctx.organisation.id,
      eventId,
      rawToken,
    );
    if (!attendee) return actionFail(NOT_FOUND_MESSAGE);

    const view = maskAttendeeForCheckIn(attendee);
    if (view.alreadyCheckedIn) {
      const badgeQueue = await getBadgeQueueInfo({
        organisationId: ctx.organisation.id,
        eventId,
        attendeeId: view.attendeeId,
      });
      return toSuccess(view, "already_checked_in", badgeQueue);
    }

    await recordCheckIn(ctx, view.attendeeId);
    const badgeQueue = await enqueueBadgeAfterCheckIn({
      organisationId: ctx.organisation.id,
      eventId,
      attendeeId: view.attendeeId,
    });
    revalidateCheckIn(orgSlug, eventId);

    const updated = await loadAttendeeByToken(
      ctx.organisation.id,
      eventId,
      rawToken,
    );
    if (!updated) return actionFail(NOT_FOUND_MESSAGE);

    return toSuccess(maskAttendeeForCheckIn(updated), "checked_in", badgeQueue);
  } catch (error) {
    return actionFail(publicActionError(error, "Could not complete check-in."));
  }
}

export async function performCheckInByAttendeeId(
  orgSlug: string,
  eventId: string,
  attendeeId: string,
): Promise<CheckInActionResult> {
  try {
    const ctx = await requireEvent(orgSlug, eventId, "checkin.perform");
    await assertScanRateLimit(ctx.user.id);

    const attendee = await loadAttendeeById(
      ctx.organisation.id,
      eventId,
      attendeeId,
    );
    if (!attendee) return actionFail(NOT_FOUND_MESSAGE);

    const view = maskAttendeeForCheckIn(attendee);
    if (view.alreadyCheckedIn) {
      const badgeQueue = await getBadgeQueueInfo({
        organisationId: ctx.organisation.id,
        eventId,
        attendeeId: view.attendeeId,
      });
      return toSuccess(view, "already_checked_in", badgeQueue);
    }

    await recordCheckIn(ctx, attendeeId);
    const badgeQueue = await enqueueBadgeAfterCheckIn({
      organisationId: ctx.organisation.id,
      eventId,
      attendeeId,
    });
    revalidateCheckIn(orgSlug, eventId);

    const updated = await loadAttendeeById(
      ctx.organisation.id,
      eventId,
      attendeeId,
    );
    if (!updated) return actionFail(NOT_FOUND_MESSAGE);

    return toSuccess(maskAttendeeForCheckIn(updated), "checked_in", badgeQueue);
  } catch (error) {
    return actionFail(publicActionError(error, "Could not complete check-in."));
  }
}

export async function searchCheckInAttendees(
  orgSlug: string,
  eventId: string,
  query: string,
): Promise<CheckInSearchResult> {
  try {
    const ctx = await requireEvent(orgSlug, eventId, "checkin.perform");
    const term = query.trim();
    if (term.length < 2) {
      return actionOk([]);
    }

    const attendees = await prisma.attendee.findMany({
      where: {
        eventId,
        organisationId: ctx.organisation.id,
        OR: [
          { firstName: { contains: term, mode: "insensitive" } },
          { lastName: { contains: term, mode: "insensitive" } },
          { company: { contains: term, mode: "insensitive" } },
        ],
      },
      select: attendeeCheckInSelect,
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      take: 12,
    });

    const rows: CheckInSearchRow[] = attendees.map((row) => {
      const view = maskAttendeeForCheckIn(row);
      return {
        attendeeId: view.attendeeId,
        name: view.name,
        company: view.company,
        category: view.category,
        alreadyCheckedIn: view.alreadyCheckedIn,
        checkedInAt: view.checkedInAt,
      };
    });

    return actionOk(rows);
  } catch (error) {
    return actionFail(publicActionError(error, "Could not search delegates."));
  }
}
