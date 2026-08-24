"use client";

/**
 * Entrance attendance scanner — validates printed badge credentials only.
 * Desk check-in (Attendee.qrTokenHash) is intentionally separate.
 */
import { useEffect, useRef, useState, useTransition } from "react";
import { CheckCircle2, ShieldAlert, ShieldCheck } from "lucide-react";
import {
  scanBadgeEntrance,
  type BadgeEntranceView,
} from "@/modules/badges/entrance-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/components/ui/toast";
import {
  detectQrFromVideo,
  isQrCameraAvailable,
  openQrCameraStream,
} from "@/lib/qr-camera";

function ResultPanel({
  view,
  onReset,
}: {
  view: BadgeEntranceView;
  onReset: () => void;
}) {
  const allowed = view.result === "ALLOWED";
  return (
    <Card className="h-full">
      <div className="flex h-full flex-col">
        <div
          className={
            allowed
              ? "mb-4 inline-flex size-12 items-center justify-center rounded-full bg-emerald-50"
              : "mb-4 inline-flex size-12 items-center justify-center rounded-full bg-rose-50"
          }
        >
          {allowed ? (
            <ShieldCheck className="size-6 text-success" aria-hidden />
          ) : (
            <ShieldAlert className="size-6 text-danger" aria-hidden />
          )}
        </div>
        <p className="font-display text-3xl text-slate-900">{view.name}</p>
        <p className="mt-2 text-slate-700">{view.company || "Company not listed"}</p>
        <p className="mt-1 text-sm text-slate-500">
          {view.category || "Uncategorised"}
          {view.printNumber ? ` · Badge #${view.printNumber}` : ""}
        </p>
        <div className="mt-4">
          {allowed ? (
            <Badge tone="success">
              <CheckCircle2 className="mr-1 size-3" aria-hidden />
              Entry allowed
            </Badge>
          ) : view.denyReason === "REVOKED" ? (
            <Badge tone="danger">Badge invalidated</Badge>
          ) : view.denyReason === "NOT_CHECKED_IN" ? (
            <Badge tone="warning">Not checked in at desk</Badge>
          ) : (
            <Badge tone="danger">Denied</Badge>
          )}
        </div>
        <p className="mt-4 text-sm text-slate-600">{view.message}</p>
        <div className="mt-auto pt-6">
          <Button type="button" variant="secondary" onClick={onReset}>
            Scan next
          </Button>
        </div>
      </div>
    </Card>
  );
}

export function EventDayEntranceScan({
  orgSlug,
  eventId,
}: {
  orgSlug: string;
  eventId: string;
}) {
  const toast = useToast();
  const [token, setToken] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<BadgeEntranceView | null>(null);
  const [requireDeskCheckIn, setRequireDeskCheckIn] = useState(true);
  const [pending, start] = useTransition();
  const [cameraOn, setCameraOn] = useState(false);
  const [cameraSupported, setCameraSupported] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanning = useRef(false);

  useEffect(() => {
    setCameraSupported(isQrCameraAvailable());
  }, []);

  function showError(message: string) {
    setError(message);
    toast.error(message);
  }

  function reset() {
    setToken("");
    setView(null);
    setError(null);
    scanning.current = false;
    setCameraOn(false);
  }

  function applyView(next: BadgeEntranceView) {
    setView(next);
    if (next.result === "ALLOWED") {
      toast.success(`${next.name} — entry allowed`);
    } else {
      toast.error(next.message);
    }
  }

  function runScan(raw: string) {
    start(async () => {
      setError(null);
      const result = await scanBadgeEntrance(orgSlug, eventId, raw, {
        requireDeskCheckIn,
      });
      if (!result.ok) {
        showError(result.error);
        scanning.current = false;
        return;
      }
      applyView(result.data);
    });
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
          runScan(raw);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cameraOn, eventId, orgSlug, requireDeskCheckIn]);

  return (
    <div className="space-y-4">
      <Card className="!p-4">
        <p className="text-sm text-slate-600">
          Scan the <strong>printed badge</strong> QR at the entrance. This is
          separate from desk check-in. Reprinted badges invalidate older ones —
          a shared or “lost” badge will be denied.
        </p>
        <label className="mt-3 flex items-center gap-2 text-sm text-slate-700">
          <Checkbox
            checked={requireDeskCheckIn}
            onChange={(e) => setRequireDeskCheckIn(e.target.checked)}
          />
          Require desk check-in before entry
        </label>
      </Card>

      <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <Label htmlFor="badge-token">Badge token</Label>
          <Input
            id="badge-token"
            value={token}
            onChange={(e) => {
              setToken(e.target.value);
              scanning.current = false;
            }}
            placeholder="Paste token from the printed badge QR"
            autoComplete="off"
            spellCheck={false}
          />
          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              type="button"
              disabled={pending || !token.trim()}
              onClick={() => runScan(token.trim())}
            >
              {pending ? "Scanning…" : "Scan badge"}
            </Button>
            {cameraSupported ? (
              <Button
                type="button"
                variant="secondary"
                disabled={pending}
                onClick={() => {
                  setError(null);
                  setCameraOn((v) => !v);
                }}
              >
                {cameraOn ? "Stop camera" : "Scan with camera"}
              </Button>
            ) : null}
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
        </Card>

        {view ? (
          <ResultPanel view={view} onReset={reset} />
        ) : (
          <Card className="flex items-center">
            <p className="text-sm text-slate-500">
              Waiting for a badge scan. Desk QR codes from the attendee app are
              not used here — only the QR printed on the badge.
            </p>
          </Card>
        )}
      </div>
    </div>
  );
}
