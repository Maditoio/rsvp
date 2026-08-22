"use server";

import { prisma } from "@/lib/db/prisma";
import { requireEvent } from "@/lib/authz/require";
import { hashToken } from "@/lib/crypto/tokens";
import { maskAttendeeForCheckIn } from "@/lib/authz/fields";
import { writeAudit } from "@/modules/audit/log";
import { rateLimit } from "@/lib/rate-limit";
import { revalidatePath } from "next/cache";
import type {
  CheckInActionResult,
  CheckInOutcome,
  CheckInSearchRow,
} from "./types";

function eventDayPaths(orgSlug: string, eventId: string) {
  return [
    `/app/${orgSlug}/events/${eventId}/day`,
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
    throw new Error("Too many scans. Slow down.");
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
) {
  await prisma.$transaction(async (tx) => {
    await tx.checkIn.create({
      data: {
        organisationId: ctx.organisation.id,
        eventId: ctx.eventId,
        attendeeId,
        checkedInById: ctx.user.id,
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
  });
}

function toActionResult(
  view: ReturnType<typeof maskAttendeeForCheckIn>,
  outcome: CheckInOutcome,
): CheckInActionResult {
  return { view, outcome };
}

export async function lookupCheckIn(
  orgSlug: string,
  eventId: string,
  rawToken: string,
) {
  const ctx = await requireEvent(orgSlug, eventId, "checkin.perform");
  await assertScanRateLimit(ctx.user.id);

  const attendee = await loadAttendeeByToken(
    ctx.organisation.id,
    eventId,
    rawToken,
  );

  if (!attendee) {
    throw new Error("Attendee not found for this event");
  }

  return maskAttendeeForCheckIn(attendee);
}

export async function performCheckIn(
  orgSlug: string,
  eventId: string,
  rawToken: string,
): Promise<CheckInActionResult> {
  const ctx = await requireEvent(orgSlug, eventId, "checkin.perform");
  await assertScanRateLimit(ctx.user.id);

  const attendee = await loadAttendeeByToken(
    ctx.organisation.id,
    eventId,
    rawToken,
  );
  if (!attendee) {
    throw new Error("Attendee not found for this event");
  }

  const view = maskAttendeeForCheckIn(attendee);
  if (view.alreadyCheckedIn) {
    return toActionResult(view, "already_checked_in");
  }

  await recordCheckIn(ctx, view.attendeeId);
  revalidateCheckIn(orgSlug, eventId);

  const updated = maskAttendeeForCheckIn(
    (await loadAttendeeByToken(ctx.organisation.id, eventId, rawToken))!,
  );
  return toActionResult(updated, "checked_in");
}

export async function performCheckInByAttendeeId(
  orgSlug: string,
  eventId: string,
  attendeeId: string,
): Promise<CheckInActionResult> {
  const ctx = await requireEvent(orgSlug, eventId, "checkin.perform");
  await assertScanRateLimit(ctx.user.id);

  const attendee = await loadAttendeeById(
    ctx.organisation.id,
    eventId,
    attendeeId,
  );
  if (!attendee) {
    throw new Error("Attendee not found for this event");
  }

  const view = maskAttendeeForCheckIn(attendee);
  if (view.alreadyCheckedIn) {
    return toActionResult(view, "already_checked_in");
  }

  await recordCheckIn(ctx, attendeeId);
  revalidateCheckIn(orgSlug, eventId);

  const updated = maskAttendeeForCheckIn(
    (await loadAttendeeById(ctx.organisation.id, eventId, attendeeId))!,
  );
  return toActionResult(updated, "checked_in");
}

export async function searchCheckInAttendees(
  orgSlug: string,
  eventId: string,
  query: string,
): Promise<CheckInSearchRow[]> {
  const ctx = await requireEvent(orgSlug, eventId, "checkin.perform");
  const term = query.trim();
  if (term.length < 2) {
    return [];
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

  return attendees.map((row) => {
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
}
