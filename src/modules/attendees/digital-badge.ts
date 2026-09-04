"use server";

import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/authz/require";
import { AuthzError } from "@/lib/db/tenant";
import { writeAudit } from "@/modules/audit/log";
import { loadBadgePrintPayload } from "@/modules/badges/service";
import type { BadgePrintPayload } from "@/modules/badges/print-payload";

export type MyDigitalBadgeLocked = {
  unlocked: false;
  eventName: string;
  checkInQrHref: string;
};

export type MyDigitalBadgeUnlocked = {
  unlocked: true;
  eventName: string;
  checkedInAt: Date;
  printNumber: number;
  badge: BadgePrintPayload;
};

export type MyDigitalBadge = MyDigitalBadgeLocked | MyDigitalBadgeUnlocked;

/**
 * Digital entrance badge for the attendee portal.
 * Unlocked only after desk check-in. Uses BadgeCredential (entrance QR),
 * not the desk attendance token.
 */
export async function getMyDigitalBadge(eventId: string): Promise<MyDigitalBadge> {
  const user = await requireUser();
  const attendee = await prisma.attendee.findFirst({
    where: { eventId, userId: user.id },
    select: {
      id: true,
      status: true,
      organisationId: true,
      attendanceTokenEnc: true,
      event: { select: { id: true, name: true } },
      checkIns: {
        orderBy: { checkedInAt: "desc" },
        take: 1,
        select: { checkedInAt: true },
      },
    },
  });

  if (!attendee) {
    throw new AuthzError("You are not registered for this event", 404);
  }

  const checkedInAt = attendee.checkIns[0]?.checkedInAt ?? null;
  const isCheckedIn =
    Boolean(checkedInAt) || attendee.status === "CHECKED_IN";

  if (!isCheckedIn) {
    return {
      unlocked: false,
      eventName: attendee.event.name,
      checkInQrHref: `/me/events/${eventId}/qr`,
    };
  }

  if (!attendee.attendanceTokenEnc) {
    throw new Error("A check-in code has not been issued yet");
  }

  const badge = await loadBadgePrintPayload(
    attendee.organisationId,
    eventId,
    attendee.id,
    { mode: "reuse", issuedByUserId: user.id },
  );

  if (!badge) {
    throw new Error("Could not load your digital badge.");
  }

  const credential = await prisma.badgeCredential.findFirst({
    where: {
      organisationId: attendee.organisationId,
      eventId,
      attendeeId: attendee.id,
      status: "ACTIVE",
    },
    orderBy: { printNumber: "desc" },
    select: { printNumber: true },
  });

  const printNumber = credential?.printNumber ?? 1;

  await writeAudit({
    organisationId: attendee.organisationId,
    eventId,
    userId: user.id,
    action: "badge.digital_view",
    resource: "attendee",
    resourceId: attendee.id,
    metadata: { printNumber },
  });

  return {
    unlocked: true,
    eventName: attendee.event.name,
    checkedInAt: checkedInAt ?? new Date(),
    printNumber,
    badge,
  };
}
