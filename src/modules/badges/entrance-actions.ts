"use server";

import { prisma } from "@/lib/db/prisma";
import { requireEvent } from "@/lib/authz/require";
import { hashToken } from "@/lib/crypto/tokens";
import { maskAttendeeForCheckIn } from "@/lib/authz/fields";
import { writeAudit } from "@/modules/audit/log";
import { rateLimit } from "@/lib/rate-limit";
import {
  actionFail,
  actionOk,
  publicActionError,
  type ActionResult,
} from "@/lib/action-result";

export type BadgeEntranceView = {
  attendeeId: string;
  name: string;
  company: string | null;
  category: string | null;
  printNumber: number | null;
  result: "ALLOWED" | "DENIED";
  denyReason: "REVOKED" | "NOT_FOUND" | "NOT_CHECKED_IN" | null;
  message: string;
};

/**
 * Entrance / attendance scan against printed badge credentials only.
 * Does not use Attendee.qrTokenHash — desk check-in stays separate.
 */
export async function scanBadgeEntrance(
  orgSlug: string,
  eventId: string,
  rawToken: string,
  options?: { requireDeskCheckIn?: boolean },
): Promise<ActionResult<BadgeEntranceView>> {
  try {
    const ctx = await requireEvent(orgSlug, eventId, "checkin.perform");
    const limited = await rateLimit(`badge-access:${ctx.user.id}`, 60, 60);
    if (!limited.success) {
      throw new Error("Too many scans. Please wait a moment and try again.");
    }

    const presentedHash = hashToken(rawToken.trim());
    const requireDesk = options?.requireDeskCheckIn !== false;

    const credential = await prisma.badgeCredential.findFirst({
      where: {
        tokenHash: presentedHash,
        eventId,
        organisationId: ctx.organisation.id,
      },
      select: {
        id: true,
        status: true,
        printNumber: true,
        attendeeId: true,
        attendee: {
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
        },
      },
    });

    if (!credential) {
      await prisma.badgeAccessScan.create({
        data: {
          organisationId: ctx.organisation.id,
          eventId,
          scannedByUserId: ctx.user.id,
          result: "DENIED",
          denyReason: "NOT_FOUND",
          presentedHash,
        },
      });
      return actionOk({
        attendeeId: "",
        name: "Unknown badge",
        company: null,
        category: null,
        printNumber: null,
        result: "DENIED",
        denyReason: "NOT_FOUND",
        message: "Badge not recognised for this event.",
      });
    }

    const viewBase = maskAttendeeForCheckIn(credential.attendee);

    if (credential.status === "REVOKED") {
      await prisma.badgeAccessScan.create({
        data: {
          organisationId: ctx.organisation.id,
          eventId,
          attendeeId: credential.attendeeId,
          credentialId: credential.id,
          scannedByUserId: ctx.user.id,
          result: "DENIED",
          denyReason: "REVOKED",
          presentedHash,
        },
      });
      await writeAudit({
        organisationId: ctx.organisation.id,
        eventId,
        userId: ctx.user.id,
        action: "badge.access_denied",
        resource: "attendee",
        resourceId: credential.attendeeId,
        metadata: { reason: "REVOKED", printNumber: credential.printNumber },
      });
      return actionOk({
        attendeeId: viewBase.attendeeId,
        name: viewBase.name,
        company: viewBase.company,
        category: viewBase.category,
        printNumber: credential.printNumber,
        result: "DENIED",
        denyReason: "REVOKED",
        message:
          "This badge was invalidated after a reprint. Ask the delegate for their current badge.",
      });
    }

    if (requireDesk && !viewBase.alreadyCheckedIn) {
      await prisma.badgeAccessScan.create({
        data: {
          organisationId: ctx.organisation.id,
          eventId,
          attendeeId: credential.attendeeId,
          credentialId: credential.id,
          scannedByUserId: ctx.user.id,
          result: "DENIED",
          denyReason: "NOT_CHECKED_IN",
          presentedHash,
        },
      });
      return actionOk({
        attendeeId: viewBase.attendeeId,
        name: viewBase.name,
        company: viewBase.company,
        category: viewBase.category,
        printNumber: credential.printNumber,
        result: "DENIED",
        denyReason: "NOT_CHECKED_IN",
        message: "Delegate has not completed desk check-in yet.",
      });
    }

    await prisma.badgeAccessScan.create({
      data: {
        organisationId: ctx.organisation.id,
        eventId,
        attendeeId: credential.attendeeId,
        credentialId: credential.id,
        scannedByUserId: ctx.user.id,
        result: "ALLOWED",
        presentedHash,
      },
    });

    await writeAudit({
      organisationId: ctx.organisation.id,
      eventId,
      userId: ctx.user.id,
      action: "badge.access_allowed",
      resource: "attendee",
      resourceId: credential.attendeeId,
      metadata: { printNumber: credential.printNumber },
    });

    return actionOk({
      attendeeId: viewBase.attendeeId,
      name: viewBase.name,
      company: viewBase.company,
      category: viewBase.category,
      printNumber: credential.printNumber,
      result: "ALLOWED",
      denyReason: null,
      message: "Entry allowed.",
    });
  } catch (error) {
    return actionFail(
      publicActionError(error, "Could not complete entrance scan."),
    );
  }
}
