"use server";

import { prisma } from "@/lib/db/prisma";
import { requireEvent } from "@/lib/authz/require";
import { hashToken } from "@/lib/crypto/tokens";
import { maskAttendeeForCheckIn } from "@/lib/authz/fields";
import { writeAudit } from "@/modules/audit/log";
import { rateLimit } from "@/lib/rate-limit";
import { revalidatePath } from "next/cache";

export async function lookupCheckIn(
  orgSlug: string,
  eventId: string,
  rawToken: string,
) {
  const ctx = await requireEvent(orgSlug, eventId, "checkin.perform");
  const limited = await rateLimit(`qr:${ctx.user.id}`, 60, 60);
  if (!limited.success) {
    throw new Error("Too many scans. Slow down.");
  }

  const attendee = await prisma.attendee.findFirst({
    where: {
      qrTokenHash: hashToken(rawToken),
      eventId,
      organisationId: ctx.organisation.id,
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      company: true,
      category: { select: { name: true } },
      checkIns: {
        orderBy: { checkedInAt: "desc" },
        take: 1,
        select: { checkedInAt: true },
      },
    },
  });

  if (!attendee) {
    throw new Error("Attendee not found for this event");
  }

  return maskAttendeeForCheckIn(attendee);
}

export async function performCheckIn(
  orgSlug: string,
  eventId: string,
  rawToken: string,
) {
  const ctx = await requireEvent(orgSlug, eventId, "checkin.perform");
  const view = await lookupCheckIn(orgSlug, eventId, rawToken);

  if (view.alreadyCheckedIn) {
    return view;
  }

  await prisma.$transaction(async (tx) => {
    await tx.checkIn.create({
      data: {
        organisationId: ctx.organisation.id,
        eventId,
        attendeeId: view.attendeeId,
        checkedInById: ctx.user.id,
      },
    });
    await tx.attendee.update({
      where: { id: view.attendeeId },
      data: { status: "CHECKED_IN" },
    });
  });

  await writeAudit({
    organisationId: ctx.organisation.id,
    eventId,
    userId: ctx.user.id,
    action: "checkin.perform",
    resource: "attendee",
    resourceId: view.attendeeId,
  });

  revalidatePath(`/app/${orgSlug}/events/${eventId}/check-in`);
  return lookupCheckIn(orgSlug, eventId, rawToken);
}
