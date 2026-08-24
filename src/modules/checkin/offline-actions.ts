"use server";

import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { requireEvent } from "@/lib/authz/require";
import { writeAudit } from "@/modules/audit/log";
import { rateLimit } from "@/lib/rate-limit";
import { revalidatePath } from "next/cache";
import {
  actionFail,
  actionOk,
  publicActionError,
  type ActionResult,
} from "@/lib/action-result";
import type { OfflineCheckInPack } from "./offline-types";

const PACK_TTL_MS = 18 * 60 * 60 * 1000; // 18 hours — morning download covers a long event day
const MAX_SYNC_BATCH = 200;

const syncItemSchema = z.object({
  clientId: z.string().min(1).max(80),
  attendeeId: z.string().min(1).max(64),
  checkedInAt: z.string().datetime(),
});

export type OfflineSyncItemResult = {
  clientId: string;
  attendeeId: string;
  outcome: "checked_in" | "already_checked_in" | "not_found";
};

function eventDayPaths(orgSlug: string, eventId: string) {
  return [
    `/app/${orgSlug}/events/${eventId}/day`,
    `/app/${orgSlug}/events/${eventId}/check-in`,
  ];
}

/**
 * Download a minimal, event-scoped attendee pack for offline QR check-in.
 * Contains qrTokenHash (not raw tokens) + staff-safe display fields only.
 */
export async function downloadOfflinePack(
  orgSlug: string,
  eventId: string,
): Promise<ActionResult<OfflineCheckInPack>> {
  try {
    const ctx = await requireEvent(orgSlug, eventId, "checkin.perform");
    const limited = await rateLimit(`offline-pack:${ctx.user.id}`, 10, 60);
    if (!limited.success) {
      throw new Error("Too many pack downloads. Please wait a moment.");
    }

    const event = await prisma.event.findFirst({
      where: { id: eventId, organisationId: ctx.organisation.id },
      select: { id: true, name: true },
    });
    if (!event) throw new Error("Event not found.");

    const rows = await prisma.attendee.findMany({
      where: {
        eventId,
        organisationId: ctx.organisation.id,
        qrTokenHash: { not: "" },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        company: true,
        qrTokenHash: true,
        category: { select: { name: true } },
        checkIns: {
          orderBy: { checkedInAt: "desc" },
          take: 1,
          select: { checkedInAt: true },
        },
      },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    });

    const now = new Date();
    const pack: OfflineCheckInPack = {
      organisationId: ctx.organisation.id,
      eventId: event.id,
      orgSlug,
      eventName: event.name,
      downloadedAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + PACK_TTL_MS).toISOString(),
      attendeeCount: rows.length,
      attendees: rows.map((row) => {
        const last = row.checkIns[0] ?? null;
        return {
          attendeeId: row.id,
          qrTokenHash: row.qrTokenHash,
          name: `${row.firstName} ${row.lastName}`.trim(),
          company: row.company,
          category: row.category?.name ?? null,
          alreadyCheckedIn: Boolean(last),
          checkedInAt: last?.checkedInAt?.toISOString() ?? null,
        };
      }),
    };

    await writeAudit({
      organisationId: ctx.organisation.id,
      eventId,
      userId: ctx.user.id,
      action: "checkin.offline_pack_download",
      resource: "event",
      resourceId: eventId,
      metadata: { attendeeCount: pack.attendeeCount },
    });

    return actionOk(pack);
  } catch (error) {
    return actionFail(
      publicActionError(error, "Could not download the offline check-in pack."),
    );
  }
}

/**
 * Sync check-ins recorded on-device while offline.
 * Idempotent: unique (eventId, attendeeId) means duplicates become already_checked_in.
 */
export async function syncOfflineCheckIns(
  orgSlug: string,
  eventId: string,
  items: unknown,
): Promise<ActionResult<{ results: OfflineSyncItemResult[]; synced: number }>> {
  try {
    const ctx = await requireEvent(orgSlug, eventId, "checkin.perform");
    const limited = await rateLimit(`offline-sync:${ctx.user.id}`, 30, 60);
    if (!limited.success) {
      throw new Error("Too many sync attempts. Please wait a moment.");
    }

    const parsed = z.array(syncItemSchema).max(MAX_SYNC_BATCH).safeParse(items);
    if (!parsed.success) {
      throw new Error("Invalid offline sync payload.");
    }

    const results: OfflineSyncItemResult[] = [];
    let synced = 0;

    for (const item of parsed.data) {
      const attendee = await prisma.attendee.findFirst({
        where: {
          id: item.attendeeId,
          eventId,
          organisationId: ctx.organisation.id,
        },
        select: {
          id: true,
          checkIns: {
            take: 1,
            select: { id: true },
          },
        },
      });

      if (!attendee) {
        results.push({
          clientId: item.clientId,
          attendeeId: item.attendeeId,
          outcome: "not_found",
        });
        continue;
      }

      if (attendee.checkIns.length > 0) {
        results.push({
          clientId: item.clientId,
          attendeeId: item.attendeeId,
          outcome: "already_checked_in",
        });
        continue;
      }

      const checkedInAt = new Date(item.checkedInAt);
      const safeCheckedInAt =
        Number.isNaN(checkedInAt.getTime()) || checkedInAt.getTime() > Date.now() + 60_000
          ? new Date()
          : checkedInAt;

      try {
        await prisma.$transaction(async (tx) => {
          await tx.checkIn.create({
            data: {
              organisationId: ctx.organisation.id,
              eventId,
              attendeeId: attendee.id,
              checkedInById: ctx.user.id,
              checkedInAt: safeCheckedInAt,
            },
          });
          await tx.attendee.update({
            where: { id: attendee.id },
            data: { status: "CHECKED_IN" },
          });
        });

        await writeAudit({
          organisationId: ctx.organisation.id,
          eventId,
          userId: ctx.user.id,
          action: "checkin.perform",
          resource: "attendee",
          resourceId: attendee.id,
          metadata: {
            source: "offline_sync",
            clientId: item.clientId,
          },
        });

        synced += 1;
        results.push({
          clientId: item.clientId,
          attendeeId: item.attendeeId,
          outcome: "checked_in",
        });
      } catch {
        // Unique constraint race → treat as already checked in
        results.push({
          clientId: item.clientId,
          attendeeId: item.attendeeId,
          outcome: "already_checked_in",
        });
      }
    }

    if (synced > 0) {
      for (const path of eventDayPaths(orgSlug, eventId)) {
        revalidatePath(path);
      }
    }

    await writeAudit({
      organisationId: ctx.organisation.id,
      eventId,
      userId: ctx.user.id,
      action: "checkin.offline_sync",
      resource: "event",
      resourceId: eventId,
      metadata: {
        attempted: parsed.data.length,
        synced,
      },
    });

    return actionOk({ results, synced });
  } catch (error) {
    return actionFail(
      publicActionError(error, "Could not sync offline check-ins."),
    );
  }
}
