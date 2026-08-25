"use client";

/**
 * Event-day check-in scanner with offline pack support.
 * Camera scan checks in immediately; manual paste uses look up then confirm.
 * When offline (or pack mode), scans validate against a local encrypted pack.
 */
import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  IdCard,
} from "lucide-react";
import {
  lookupCheckIn,
  performCheckIn,
} from "@/modules/checkin/actions";
import { useOfflineCheckIn } from "@/modules/checkin/use-offline-check-in";
import type { CheckInOutcome } from "@/modules/checkin/types";
import type { CheckInView } from "@/lib/authz/fields";
import type { BadgeQueueInfo } from "@/modules/badges/queue";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import {
  detectQrFromVideo,
  isQrCameraAvailable,
  openQrCameraStream,
} from "@/lib/qr-camera";

function formatCheckedInAt(value: Date | null) {
  if (!value) return null;
  return new Date(value).toLocaleString();
}

function isNetworkError(error: unknown) {
  if (typeof navigator !== "undefined" && !navigator.onLine) return true;
  if (error instanceof TypeError) return true;
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    return (
      msg.includes("failed to fetch") ||
      msg.includes("network") ||
      msg.includes("load failed")
    );
  }
  return false;
}

function ResultPanel({
  view,
  outcome,
  pending,
  offlineSaved,
  badgeQueue,
  orgSlug,
  eventId,
  onConfirm,
  onReset,
}: {
  view: CheckInView;
  outcome: CheckInOutcome;
  pending: boolean;
  offlineSaved?: boolean;
  badgeQueue?: BadgeQueueInfo | null;
  orgSlug: string;
  eventId: string;
  onConfirm: () => void;
  onReset: () => void;
}) {
  const checkedInAt = formatCheckedInAt(view.checkedInAt);
  const queueHref = `/app/${orgSlug}/events/${eventId}/day/badges`;

  return (
    <Card className="h-full">
      <div className="flex h-full flex-col">
        {outcome === "checked_in" ? (
          <div className="mb-4 inline-flex size-12 items-center justify-center rounded-full bg-emerald-50">
            <CheckCircle2 className="size-6 text-success" aria-hidden />
          </div>
        ) : (
          <div className="mb-4 inline-flex size-10 items-center justify-center rounded-full bg-slate-100">
            <span className="size-2 rounded-full bg-amber-500" aria-hidden />
          </div>
        )}

        <p className="text-3xl font-semibold tracking-[-0.02em] text-slate-900">
          {view.name}
        </p>
        <p className="mt-2 text-slate-700">{view.company || "Company not listed"}</p>
        <p className="mt-1 text-sm text-slate-500">
          {view.category || "Uncategorised"}
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          {outcome === "checked_in" ? (
            <Badge tone="success">Checked in successfully</Badge>
          ) : outcome === "already_checked_in" ? (
            <Badge tone="warning">Already checked in</Badge>
          ) : (
            <Badge tone="muted">Ready to check in</Badge>
          )}
          {offlineSaved ? <Badge tone="muted">Saved offline</Badge> : null}
          {badgeQueue?.justQueued ? (
            <Badge tone="warning">Added to badge queue</Badge>
          ) : badgeQueue?.status === "QUEUED" ? (
            <Badge tone="warning">Waiting for badge print</Badge>
          ) : badgeQueue?.status === "PRINTED" ? (
            <Badge tone="success">
              Badge #{badgeQueue.printNumber ?? 1} printed
            </Badge>
          ) : null}
        </div>

        {outcome === "checked_in" ? (
          <p className="mt-4 text-sm text-success">
            {offlineSaved
              ? "Attendance saved on this device — sync when online (then joins the badge queue)."
              : "Attendance recorded"}
            {checkedInAt ? ` · ${checkedInAt}` : ""}.
          </p>
        ) : null}

        {outcome === "already_checked_in" ? (
          <p className="mt-4 text-sm text-slate-600">
            This delegate was already checked in
            {checkedInAt ? ` at ${checkedInAt}` : ""}. No duplicate record was
            created.
          </p>
        ) : null}

        {badgeQueue?.justQueued ||
        (outcome !== "ready" && badgeQueue?.status === "QUEUED") ? (
          <div className="mt-4 rounded-xl bg-indigo-50 px-3.5 py-3">
            <p className="text-sm font-medium text-indigo-900">
              Next: print their badge
            </p>
            <p className="mt-1 text-sm text-indigo-700/90">
              {badgeQueue.printNumber
                ? `Replacement Badge #${badgeQueue.printNumber} is waiting in the queue.`
                : "They are in the badge queue for their first issue."}
            </p>
            <Link
              href={queueHref}
              className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-700 hover:text-indigo-800"
            >
              <IdCard className="size-4" strokeWidth={1.75} aria-hidden />
              Open badge queue
            </Link>
          </div>
        ) : null}

        {outcome === "ready" ? (
          <Button
            type="button"
            className="mt-6"
            disabled={pending}
            onClick={onConfirm}
          >
            {pending ? "Checking in…" : "Confirm check-in"}
          </Button>
        ) : null}

        <div className="mt-auto flex flex-wrap gap-2 pt-6">
          <Button type="button" variant="secondary" onClick={onReset}>
            Scan next guest
          </Button>
          {outcome !== "ready" ? (
            <Link href={queueHref}>
              <Button type="button" variant="ghost">
                Badge queue
              </Button>
            </Link>
          ) : null}
        </div>
      </div>
    </Card>
  );
}

export function EventDayCheckIn({
  orgSlug,
  eventId,
}: {
  orgSlug: string;
  eventId: string;
}) {
  const toast = useToast();
  const offline = useOfflineCheckIn(orgSlug, eventId);
  const [token, setToken] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<CheckInView | null>(null);
  const [outcome, setOutcome] = useState<CheckInOutcome | null>(null);
  const [badgeQueue, setBadgeQueue] = useState<BadgeQueueInfo | null>(null);
  const [offlineSaved, setOfflineSaved] = useState(false);
  const [pending, start] = useTransition();
  const [cameraOn, setCameraOn] = useState(false);
  const [cameraSupported] = useState(() => isQrCameraAvailable());
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanning = useRef(false);

  const showingOfflineDesk = !offline.online && offline.canScanOffline;

  function showError(message: string) {
    setError(message);
    toast.error(message);
  }

  function resetScanner() {
    setToken("");
    setView(null);
    setOutcome(null);
    setBadgeQueue(null);
    setError(null);
    setOfflineSaved(false);
    scanning.current = false;
    setCameraOn(false);
  }

  function applyResult(
    result: {
      view: CheckInView;
      outcome: CheckInOutcome;
      badgeQueue?: BadgeQueueInfo;
    },
    savedOffline = false,
  ) {
    setView(result.view);
    setOutcome(result.outcome);
    setBadgeQueue(result.badgeQueue ?? null);
    setOfflineSaved(savedOffline);
    if (result.outcome === "checked_in") {
      const queuedNote =
        !savedOffline && result.badgeQueue?.justQueued
          ? " Added to badge queue."
          : "";
      toast.success(
        savedOffline
          ? `${result.view.name} saved offline.`
          : `${result.view.name} checked in.${queuedNote}`,
      );
    } else if (result.outcome === "already_checked_in") {
      toast.error(`${result.view.name} is already checked in.`);
    }
  }

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      void navigator.serviceWorker
        .register("/sw-checkin.js")
        .catch(() => {
          // Non-fatal — offline pack still works without SW.
        });
    }
  }, []);

  useEffect(() => {
    if (!offline.online || offline.pendingCount === 0 || offline.busy) return;
    const timer = window.setTimeout(() => {
      void offline.syncPending().then((result) => {
        if (result.ok && result.synced > 0) {
          toast.success(
            `Synced ${result.synced} offline check-in${result.synced === 1 ? "" : "s"}.`,
          );
        }
      }).catch(() => {
        // Stay quiet; staff can tap Sync.
      });
    }, 800);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- auto-sync when connectivity returns
  }, [offline.online, offline.pendingCount]);

  async function checkInWithFallback(raw: string) {
    const preferOffline = !offline.online && offline.canScanOffline;
    if (preferOffline) {
      const local = await offline.checkInOffline(raw);
      if ("error" in local) return { error: local.error };
      return { ...local, savedOffline: true };
    }

    try {
      const result = await performCheckIn(orgSlug, eventId, raw);
      if (!result.ok) {
        if (isNetworkError(result.error) && offline.canScanOffline) {
          const local = await offline.checkInOffline(raw);
          if ("error" in local) return { error: local.error };
          return { ...local, savedOffline: true };
        }
        return { error: result.error };
      }
      return { ...result.data, savedOffline: false };
    } catch (error) {
      if (offline.canScanOffline && isNetworkError(error)) {
        const local = await offline.checkInOffline(raw);
        if ("error" in local) return { error: local.error };
        return { ...local, savedOffline: true };
      }
      return {
        error:
          error instanceof Error ? error.message : "Could not complete check-in.",
      };
    }
  }

  useEffect(() => {
    if (!cameraOn) {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      return;
    }

    let cancelled = false;
    let detecting = false;

    (async () => {
      try {
        const stream = await openQrCameraStream();
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
      } catch {
        showError(
          "Camera permission was denied or no camera is available on this device.",
        );
        setCameraOn(false);
      }
    })();

    const timer = window.setInterval(async () => {
      if (scanning.current || detecting || !videoRef.current) return;
      detecting = true;
      try {
        const raw = await detectQrFromVideo(videoRef.current);
        if (raw) {
          scanning.current = true;
          setToken(raw);
          setCameraOn(false);
          start(async () => {
            setError(null);
            const result = await checkInWithFallback(raw);
            if ("error" in result) {
              showError(result.error ?? "Could not complete check-in.");
              scanning.current = false;
              return;
            }
            applyResult(result, result.savedOffline);
          });
        }
      } finally {
        detecting = false;
      }
    }, 350);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- scanner effect keyed to camera session
  }, [cameraOn, eventId, orgSlug, offline.online, offline.canScanOffline]);

  function runLookup() {
    const raw = token.trim();
    if (!raw) {
      showError("Paste or scan an attendance token.");
      return;
    }
    setError(null);
    start(async () => {
      if (!offline.online && offline.canScanOffline) {
        const local = await offline.lookupOffline(raw);
        if ("error" in local) {
          setView(null);
          setOutcome(null);
          showError(local.error);
          return;
        }
        setOfflineSaved(false);
        setView(local);
        setOutcome(local.alreadyCheckedIn ? "already_checked_in" : "ready");
        return;
      }

      try {
        const result = await lookupCheckIn(orgSlug, eventId, raw);
        if (!result.ok) {
          if (isNetworkError(result.error) && offline.canScanOffline) {
            const local = await offline.lookupOffline(raw);
            if ("error" in local) {
              showError(local.error);
              return;
            }
            setView(local);
            setOutcome(local.alreadyCheckedIn ? "already_checked_in" : "ready");
            return;
          }
          setView(null);
          setOutcome(null);
          showError(result.error);
          return;
        }
        setOfflineSaved(false);
        setView(result.data);
        setOutcome(result.data.alreadyCheckedIn ? "already_checked_in" : "ready");
      } catch (error) {
        if (offline.canScanOffline && isNetworkError(error)) {
          const local = await offline.lookupOffline(raw);
          if ("error" in local) {
            showError(local.error);
            return;
          }
          setView(local);
          setOutcome(local.alreadyCheckedIn ? "already_checked_in" : "ready");
          return;
        }
        showError(
          error instanceof Error ? error.message : "Could not look up this attendee.",
        );
      }
    });
  }

  function runCheckIn() {
    const raw = token.trim();
    if (!raw) return;
    setError(null);
    start(async () => {
      const result = await checkInWithFallback(raw);
      if ("error" in result) {
        showError(result.error ?? "Could not complete check-in.");
        return;
      }
      applyResult(result, result.savedOffline);
    });
  }

  const packMissingOffline = !offline.online && !offline.canScanOffline;

  return (
    <div className="space-y-4">
      {packMissingOffline ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 shadow-sm">
          You are offline and this device has no unlocked pack. Reconnect, then
          use <strong>Download pack</strong> in the top bar before doors open.
        </p>
      ) : null}

      <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <Label htmlFor="attendance-token">Attendance token</Label>
          <Input
            id="attendance-token"
            value={token}
            onChange={(e) => {
              setToken(e.target.value);
              scanning.current = false;
            }}
            placeholder="Paste the opaque token from the attendee QR"
            autoComplete="off"
            spellCheck={false}
          />
          <div className="mt-4 flex flex-wrap gap-2">
            <Button type="button" disabled={pending} onClick={runLookup}>
              {pending ? "Working…" : "Look up"}
            </Button>
            {cameraSupported ? (
              <Button
                type="button"
                variant="secondary"
                disabled={pending}
                onClick={() => {
                  setError(null);
                  setCameraOn((value) => !value);
                }}
              >
                {cameraOn ? "Stop camera" : "Scan with camera"}
              </Button>
            ) : (
              <p className="self-center text-xs text-slate-500">
                Camera needs HTTPS (or localhost). Paste the token instead.
              </p>
            )}
          </div>
          {cameraOn ? (
            <video
              ref={videoRef}
              className="mt-4 aspect-[4/3] w-full rounded-md bg-slate-900 object-cover"
              playsInline
              muted
              autoPlay
            />
          ) : null}
          {error ? (
            <p className="mt-3 rounded-md border border-danger/20 bg-danger/5 px-3 py-2 text-sm text-danger">
              {error}
            </p>
          ) : null}
          {showingOfflineDesk ? (
            <p className="mt-3 text-xs text-slate-500">
              Using local offline pack for validation on this desk.
            </p>
          ) : null}
        </Card>

        {view && outcome ? (
          <ResultPanel
            view={view}
            outcome={outcome}
            pending={pending}
            offlineSaved={offlineSaved}
            badgeQueue={badgeQueue}
            orgSlug={orgSlug}
            eventId={eventId}
            onConfirm={runCheckIn}
            onReset={resetScanner}
          />
        ) : (
          <Card className="flex items-center">
            <p className="text-sm text-slate-500">
              Scan a QR code to check someone in immediately, or paste a token
              and look them up first.
            </p>
          </Card>
        )}
      </div>
    </div>
  );
}
