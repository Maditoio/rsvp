import "server-only";

import { prisma } from "@/lib/db/prisma";
import { writeAudit } from "@/modules/audit/log";
import { rotateBadgeCredential } from "./credentials";
import { classifyPreprintCandidate } from "./preprint";

export { classifyPreprintCandidate } from "./preprint";
export type { PreprintCandidateAction } from "./preprint";

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

export type PreprintEnqueueResult = {
  queued: number;
  alreadyQueued: number;
  skippedPrinted: number;
  skippedNoQr: number;
  attendeeIds: string[];
};

/**
 * Put registered attendees on the badge print queue without check-in
 * (pre-print / cut-out sheets). Skips already-printed badges and people
 * without a desk QR token.
 */
export async function enqueueAttendeesForPreprint(input: {
  organisationId: string;
  eventId: string;
  attendeeIds: string[];
  userId?: string | null;
}): Promise<PreprintEnqueueResult> {
  const uniqueIds = [...new Set(input.attendeeIds.filter(Boolean))];
  if (uniqueIds.length === 0) {
    return {
      queued: 0,
      alreadyQueued: 0,
      skippedPrinted: 0,
      skippedNoQr: 0,
      attendeeIds: [],
    };
  }

  const [attendees, existingBadges] = await Promise.all([
    prisma.attendee.findMany({
      where: {
        organisationId: input.organisationId,
        eventId: input.eventId,
        id: { in: uniqueIds },
      },
      select: { id: true, attendanceTokenEnc: true },
    }),
    prisma.badge.findMany({
      where: {
        organisationId: input.organisationId,
        eventId: input.eventId,
        attendeeId: { in: uniqueIds },
      },
      select: { id: true, attendeeId: true, status: true },
    }),
  ]);

  const badgeByAttendee = new Map(
    existingBadges.map((b) => [b.attendeeId, b] as const),
  );

  let queued = 0;
  let alreadyQueued = 0;
  let skippedPrinted = 0;
  let skippedNoQr = 0;
  const queuedIds: string[] = [];
  const now = new Date();

  for (const attendee of attendees) {
    const existing = badgeByAttendee.get(attendee.id);
    const action = classifyPreprintCandidate(
      Boolean(attendee.attendanceTokenEnc),
      existing?.status,
    );

    if (action === "no_qr") {
      skippedNoQr++;
      continue;
    }
    if (action === "printed") {
      skippedPrinted++;
      continue;
    }
    if (action === "already_queued") {
      alreadyQueued++;
      queuedIds.push(attendee.id);
      continue;
    }

    if (existing) {
      await prisma.badge.update({
        where: { id: existing.id },
        data: { status: "QUEUED", queuedAt: now },
      });
    } else {
      await prisma.badge.create({
        data: {
          organisationId: input.organisationId,
          eventId: input.eventId,
          attendeeId: attendee.id,
          status: "QUEUED",
          queuedAt: now,
        },
      });
    }
    queued++;
    queuedIds.push(attendee.id);
  }

  if (queued > 0) {
    await writeAudit({
      organisationId: input.organisationId,
      eventId: input.eventId,
      userId: input.userId ?? null,
      action: "badge.preprint_queue",
      resource: "event",
      resourceId: input.eventId,
      metadata: {
        queued,
        alreadyQueued,
        skippedPrinted,
        skippedNoQr,
        requested: uniqueIds.length,
      },
    });
  }

  return {
    queued,
    alreadyQueued,
    skippedPrinted,
    skippedNoQr,
    attendeeIds: queuedIds,
  };
}

/** All attendees with a desk QR who are not already printed. */
export async function listEligiblePreprintAttendeeIds(
  organisationId: string,
  eventId: string,
): Promise<string[]> {
  const [attendees, printed] = await Promise.all([
    prisma.attendee.findMany({
      where: {
        organisationId,
        eventId,
        attendanceTokenEnc: { not: null },
      },
      select: { id: true },
    }),
    prisma.badge.findMany({
      where: { organisationId, eventId, status: "PRINTED" },
      select: { attendeeId: true },
    }),
  ]);

  const printedSet = new Set(printed.map((b) => b.attendeeId));
  return attendees.filter((a) => !printedSet.has(a.id)).map((a) => a.id);
}
