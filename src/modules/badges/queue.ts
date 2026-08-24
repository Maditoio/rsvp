import "server-only";

import { prisma } from "@/lib/db/prisma";
import { writeAudit } from "@/modules/audit/log";
import { rotateBadgeCredential } from "./credentials";

export type BadgeQueueInfo = {
  queued: boolean;
  status: "QUEUED" | "PRINTED" | null;
  printNumber: number | null;
  /** True when check-in added or refreshed them on the print queue. */
  justQueued: boolean;
};

/**
 * After desk check-in: put the delegate on the badge print queue unless they
 * already have a printed badge (active PRINTED record).
 */
export async function enqueueBadgeAfterCheckIn(input: {
  organisationId: string;
  eventId: string;
  attendeeId: string;
}): Promise<BadgeQueueInfo> {
  const [existing, activeCred] = await Promise.all([
    prisma.badge.findUnique({
      where: {
        eventId_attendeeId: {
          eventId: input.eventId,
          attendeeId: input.attendeeId,
        },
      },
      select: {
        id: true,
        status: true,
        printedAt: true,
      },
    }),
    prisma.badgeCredential.findFirst({
      where: {
        organisationId: input.organisationId,
        eventId: input.eventId,
        attendeeId: input.attendeeId,
        status: "ACTIVE",
      },
      select: { printNumber: true },
      orderBy: { printNumber: "desc" },
    }),
  ]);

  if (existing?.status === "PRINTED") {
    return {
      queued: false,
      status: "PRINTED",
      printNumber: activeCred?.printNumber ?? null,
      justQueued: false,
    };
  }

  const now = new Date();

  if (existing) {
    await prisma.badge.update({
      where: { id: existing.id },
      data: {
        status: "QUEUED",
        queuedAt: now,
      },
    });
  } else {
    await prisma.badge.create({
      data: {
        organisationId: input.organisationId,
        eventId: input.eventId,
        attendeeId: input.attendeeId,
        status: "QUEUED",
        queuedAt: now,
      },
    });
  }

  await writeAudit({
    organisationId: input.organisationId,
    eventId: input.eventId,
    action: "badge.queue",
    resource: "attendee",
    resourceId: input.attendeeId,
    metadata: { printNumber: activeCred?.printNumber ?? null },
  });

  return {
    queued: true,
    status: "QUEUED",
    printNumber: activeCred?.printNumber ?? null,
    justQueued: true,
  };
}

export async function getBadgeQueueInfo(input: {
  organisationId: string;
  eventId: string;
  attendeeId: string;
}): Promise<BadgeQueueInfo> {
  const [badge, activeCred] = await Promise.all([
    prisma.badge.findUnique({
      where: {
        eventId_attendeeId: {
          eventId: input.eventId,
          attendeeId: input.attendeeId,
        },
      },
      select: { status: true },
    }),
    prisma.badgeCredential.findFirst({
      where: {
        organisationId: input.organisationId,
        eventId: input.eventId,
        attendeeId: input.attendeeId,
        status: "ACTIVE",
      },
      select: { printNumber: true },
      orderBy: { printNumber: "desc" },
    }),
  ]);

  if (!badge) {
    return {
      queued: false,
      status: null,
      printNumber: null,
      justQueued: false,
    };
  }

  return {
    queued: badge.status === "QUEUED",
    status: badge.status,
    printNumber: activeCred?.printNumber ?? null,
    justQueued: false,
  };
}

export type BadgeQueueRow = {
  badgeId: string;
  attendeeId: string;
  firstName: string;
  lastName: string;
  company: string | null;
  categoryName: string | null;
  status: "QUEUED" | "PRINTED";
  queuedAt: Date | null;
  printedAt: Date | null;
  activePrintNumber: number | null;
  checkedInAt: Date | null;
};

export async function loadBadgePrintQueue(
  organisationId: string,
  eventId: string,
): Promise<BadgeQueueRow[]> {
  const [badges, credentials] = await Promise.all([
    prisma.badge.findMany({
      where: { organisationId, eventId },
      orderBy: [{ status: "asc" }, { queuedAt: "asc" }, { printedAt: "desc" }],
      select: {
        id: true,
        attendeeId: true,
        status: true,
        queuedAt: true,
        printedAt: true,
        attendee: {
          select: {
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
        },
      },
    }),
    prisma.badgeCredential.findMany({
      where: { organisationId, eventId, status: "ACTIVE" },
      select: { attendeeId: true, printNumber: true },
    }),
  ]);

  const printByAttendee = new Map(
    credentials.map((c) => [c.attendeeId, c.printNumber]),
  );

  return badges
    .map((b) => ({
      badgeId: b.id,
      attendeeId: b.attendeeId,
      firstName: b.attendee.firstName,
      lastName: b.attendee.lastName,
      company: b.attendee.company,
      categoryName: b.attendee.category?.name ?? null,
      status: b.status,
      queuedAt: b.queuedAt,
      printedAt: b.printedAt,
      activePrintNumber: printByAttendee.get(b.attendeeId) ?? null,
      checkedInAt: b.attendee.checkIns[0]?.checkedInAt ?? null,
    }))
    .sort((a, b) => {
      if (a.status !== b.status) {
        return a.status === "QUEUED" ? -1 : 1;
      }
      const aTime = a.queuedAt?.getTime() ?? 0;
      const bTime = b.queuedAt?.getTime() ?? 0;
      return aTime - bTime;
    });
}

/**
 * Invalidate the current physical badge: rotate credential (old QR fails at
 * entrance) and put the delegate back on the print queue for a replacement.
 */
export async function invalidateAndRequeueBadge(input: {
  organisationId: string;
  eventId: string;
  attendeeId: string;
  issuedByUserId?: string | null;
}): Promise<{ printNumber: number }> {
  const issued = await rotateBadgeCredential({
    organisationId: input.organisationId,
    eventId: input.eventId,
    attendeeId: input.attendeeId,
    issuedByUserId: input.issuedByUserId,
    reason: "invalidated",
  });

  const now = new Date();
  await prisma.badge.upsert({
    where: {
      eventId_attendeeId: {
        eventId: input.eventId,
        attendeeId: input.attendeeId,
      },
    },
    create: {
      organisationId: input.organisationId,
      eventId: input.eventId,
      attendeeId: input.attendeeId,
      status: "QUEUED",
      queuedAt: now,
    },
    update: {
      status: "QUEUED",
      queuedAt: now,
    },
  });

  await writeAudit({
    organisationId: input.organisationId,
    eventId: input.eventId,
    userId: input.issuedByUserId ?? null,
    action: "badge.invalidate",
    resource: "attendee",
    resourceId: input.attendeeId,
    metadata: { printNumber: issued.printNumber },
  });

  return { printNumber: issued.printNumber };
}
