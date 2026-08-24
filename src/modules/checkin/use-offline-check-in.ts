"use client";

import { useCallback, useEffect, useState } from "react";
import {
  downloadOfflinePack,
  syncOfflineCheckIns,
} from "@/modules/checkin/offline-actions";
import { hashTokenBrowser } from "@/modules/checkin/offline-crypto";
import {
  clearOfflinePack,
  countPendingCheckIns,
  enqueueOfflineCheckIn,
  findOfflineAttendeeByTokenHash,
  getOfflinePackSummary,
  listPendingCheckIns,
  markOfflineAttendeeCheckedIn,
  newClientId,
  removePendingCheckIns,
  saveOfflinePack,
  type OfflinePackSummary,
} from "@/modules/checkin/offline-store";
import type { CheckInView } from "@/lib/authz/fields";
import type { CheckInOutcome } from "@/modules/checkin/types";

export type OfflineDeskStatus = {
  online: boolean;
  pack: OfflinePackSummary | null;
  pendingCount: number;
};

export function useOfflineCheckIn(orgSlug: string, eventId: string) {
  const [online, setOnline] = useState(
    () => (typeof navigator !== "undefined" ? navigator.onLine : true),
  );
  const [pack, setPack] = useState<OfflinePackSummary | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    const summary = await getOfflinePackSummary(eventId);
    setPack(summary);
    setPendingCount(await countPendingCheckIns(eventId));
  }, [eventId]);

  useEffect(() => {
    void refresh();
    function onOnline() {
      setOnline(true);
    }
    function onOffline() {
      setOnline(false);
    }
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, [refresh]);

  const canScanOffline =
    Boolean(pack) &&
    Boolean(pack?.unlockable) &&
    !pack?.expired;

  const downloadPack = useCallback(async () => {
    setBusy(true);
    try {
      const result = await downloadOfflinePack(orgSlug, eventId);
      if (!result.ok) throw new Error(result.error);
      await saveOfflinePack(result.data);
      await refresh();
      return { ok: true as const, count: result.data.attendeeCount };
    } finally {
      setBusy(false);
    }
  }, [orgSlug, eventId, refresh]);

  const clearPack = useCallback(async () => {
    await clearOfflinePack(eventId);
    await refresh();
  }, [eventId, refresh]);

  const checkInOffline = useCallback(
    async (
      rawToken: string,
    ): Promise<{ view: CheckInView; outcome: CheckInOutcome } | { error: string }> => {
      if (!canScanOffline) {
        return {
          error:
            "Offline pack is missing or locked. Connect to the internet and download the pack first.",
        };
      }
      const hash = await hashTokenBrowser(rawToken.trim());
      const attendee = await findOfflineAttendeeByTokenHash(eventId, hash);
      if (!attendee) {
        return {
          error:
            "No attendee found for this event. Check the QR code, or refresh the offline pack online.",
        };
      }

      const view: CheckInView = {
        attendeeId: attendee.attendeeId,
        name: attendee.name,
        company: attendee.company,
        category: attendee.category,
        alreadyCheckedIn: attendee.alreadyCheckedIn,
        checkedInAt: attendee.checkedInAt
          ? new Date(attendee.checkedInAt)
          : null,
      };

      if (attendee.alreadyCheckedIn) {
        return { view, outcome: "already_checked_in" };
      }

      const checkedInAt = new Date().toISOString();
      const clientId = newClientId();
      await enqueueOfflineCheckIn(eventId, {
        clientId,
        attendeeId: attendee.attendeeId,
        name: attendee.name,
        checkedInAt,
        status: "pending",
      });
      await markOfflineAttendeeCheckedIn(
        eventId,
        attendee.attendeeId,
        checkedInAt,
      );
      await refresh();

      return {
        view: {
          ...view,
          alreadyCheckedIn: true,
          checkedInAt: new Date(checkedInAt),
        },
        outcome: "checked_in",
      };
    },
    [canScanOffline, eventId, refresh],
  );

  const lookupOffline = useCallback(
    async (rawToken: string): Promise<CheckInView | { error: string }> => {
      if (!canScanOffline) {
        return {
          error:
            "Offline pack is missing or locked. Connect to the internet and download the pack first.",
        };
      }
      const hash = await hashTokenBrowser(rawToken.trim());
      const attendee = await findOfflineAttendeeByTokenHash(eventId, hash);
      if (!attendee) {
        return {
          error:
            "No attendee found for this event. Check the QR code, or refresh the offline pack online.",
        };
      }
      return {
        attendeeId: attendee.attendeeId,
        name: attendee.name,
        company: attendee.company,
        category: attendee.category,
        alreadyCheckedIn: attendee.alreadyCheckedIn,
        checkedInAt: attendee.checkedInAt
          ? new Date(attendee.checkedInAt)
          : null,
      };
    },
    [canScanOffline, eventId],
  );

  const syncPending = useCallback(async () => {
    setBusy(true);
    try {
      const pending = await listPendingCheckIns(eventId);
      if (pending.length === 0) {
        return { ok: true as const, synced: 0, remaining: 0 };
      }
      const result = await syncOfflineCheckIns(
        orgSlug,
        eventId,
        pending.map((p) => ({
          clientId: p.clientId,
          attendeeId: p.attendeeId,
          checkedInAt: p.checkedInAt,
        })),
      );
      if (!result.ok) throw new Error(result.error);

      const doneIds = result.data.results
        .filter((r) => r.outcome !== "not_found")
        .map((r) => r.clientId);
      await removePendingCheckIns(doneIds);
      await refresh();
      return {
        ok: true as const,
        synced: result.data.synced,
        remaining: await countPendingCheckIns(eventId),
      };
    } finally {
      setBusy(false);
    }
  }, [orgSlug, eventId, refresh]);

  return {
    online,
    pack,
    pendingCount,
    busy,
    canScanOffline,
    refresh,
    downloadPack,
    clearPack,
    checkInOffline,
    lookupOffline,
    syncPending,
  };
}
