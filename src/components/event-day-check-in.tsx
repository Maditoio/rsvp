"use client";

/**
 * Event-day check-in scanner.
 * Camera scan checks in immediately; manual paste uses look up then confirm.
 */
import { useEffect, useRef, useState, useTransition } from "react";
import { CheckCircle2 } from "lucide-react";
import {
  lookupCheckIn,
  performCheckIn,
} from "@/modules/checkin/actions";
import type { CheckInOutcome } from "@/modules/checkin/types";
import type { CheckInView } from "@/lib/authz/fields";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";

type BarcodeDetectorLike = {
  detect: (source: ImageBitmapSource) => Promise<Array<{ rawValue: string }>>;
};

function getDetector(): BarcodeDetectorLike | null {
  const Ctor = (
    window as unknown as {
      BarcodeDetector?: new (opts: { formats: string[] }) => BarcodeDetectorLike;
    }
  ).BarcodeDetector;
  if (!Ctor) return null;
  try {
    return new Ctor({ formats: ["qr_code"] });
  } catch {
    return null;
  }
}

function formatCheckedInAt(value: Date | null) {
  if (!value) return null;
  return new Date(value).toLocaleString();
}

function ResultPanel({
  view,
  outcome,
  pending,
  onConfirm,
  onReset,
}: {
  view: CheckInView;
  outcome: CheckInOutcome;
  pending: boolean;
  onConfirm: () => void;
  onReset: () => void;
}) {
  const checkedInAt = formatCheckedInAt(view.checkedInAt);

  return (
    <Card className="h-full">
      <div className="flex h-full flex-col">
        {outcome === "checked_in" ? (
          <div className="mb-4 inline-flex size-12 items-center justify-center rounded-full bg-emerald-50">
            <CheckCircle2 className="size-6 text-success" aria-hidden />
          </div>
        ) : (
          <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-md border border-slate-200 bg-slate-50">
            <span className="h-2 w-2 rounded-full bg-amber-500/100" aria-hidden />
          </div>
        )}

        <p className="font-display text-3xl text-slate-900">{view.name}</p>
        <p className="mt-2 text-slate-700">{view.company || "Company not listed"}</p>
        <p className="mt-1 text-sm text-slate-500">
          {view.category || "Uncategorised"}
        </p>

        <div className="mt-4">
          {outcome === "checked_in" ? (
            <Badge tone="success">Checked in successfully</Badge>
          ) : outcome === "already_checked_in" ? (
            <Badge tone="warning">Already checked in</Badge>
          ) : (
            <Badge tone="muted">Ready to check in</Badge>
          )}
        </div>

        {outcome === "checked_in" ? (
          <p className="mt-4 text-sm text-success">
            Attendance recorded
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

        <div className="mt-auto pt-6">
          <Button type="button" variant="secondary" onClick={onReset}>
            Scan next guest
          </Button>
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
  const [token, setToken] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<CheckInView | null>(null);
  const [outcome, setOutcome] = useState<CheckInOutcome | null>(null);
  const [pending, start] = useTransition();
  const [cameraOn, setCameraOn] = useState(false);
  const [cameraSupported] = useState(
    () =>
      typeof window !== "undefined" &&
      Boolean(getDetector() && navigator.mediaDevices?.getUserMedia),
  );
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanning = useRef(false);

  function showError(message: string) {
    setError(message);
    toast.error(message);
  }

  function resetScanner() {
    setToken("");
    setView(null);
    setOutcome(null);
    setError(null);
    scanning.current = false;
    setCameraOn(false);
  }

  function applyResult(result: { view: CheckInView; outcome: CheckInOutcome }) {
    setView(result.view);
    setOutcome(result.outcome);
    if (result.outcome === "checked_in") {
      toast.success(`${result.view.name} checked in.`);
    } else if (result.outcome === "already_checked_in") {
      toast.error(`${result.view.name} is already checked in.`);
    }
  }

  useEffect(() => {
    if (!cameraOn) {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      return;
    }

    let cancelled = false;
    const detector = getDetector();

    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
        });
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
        showError("Camera permission was denied.");
        setCameraOn(false);
      }
    })();

    const timer = window.setInterval(async () => {
      if (scanning.current || !detector || !videoRef.current) return;
      if (videoRef.current.readyState < 2) return;
      try {
        const codes = await detector.detect(videoRef.current);
        const raw = codes[0]?.rawValue?.trim();
        if (raw) {
          scanning.current = true;
          setToken(raw);
          setCameraOn(false);
          start(async () => {
            setError(null);
            const result = await performCheckIn(orgSlug, eventId, raw);
            if (!result.ok) {
              showError(result.error);
              scanning.current = false;
              return;
            }
            applyResult(result.data);
          });
        }
      } catch {
        // Unsupported frame; try again.
      }
    }, 400);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- scanner effect keyed to camera session
  }, [cameraOn, eventId, orgSlug]);

  function runLookup() {
    const raw = token.trim();
    if (!raw) {
      showError("Paste or scan an attendance token.");
      return;
    }
    setError(null);
    start(async () => {
      const result = await lookupCheckIn(orgSlug, eventId, raw);
      if (!result.ok) {
        setView(null);
        setOutcome(null);
        showError(result.error);
        return;
      }
      setView(result.data);
      setOutcome(result.data.alreadyCheckedIn ? "already_checked_in" : "ready");
    });
  }

  function runCheckIn() {
    const raw = token.trim();
    if (!raw) return;
    setError(null);
    start(async () => {
      const result = await performCheckIn(orgSlug, eventId, raw);
      if (!result.ok) {
        showError(result.error);
        return;
      }
      applyResult(result.data);
    });
  }

  return (
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
              Camera QR scan is unavailable in this browser. Paste the token.
            </p>
          )}
        </div>
        {cameraOn ? (
          <video
            ref={videoRef}
            className="mt-4 aspect-[4/3] w-full rounded-md bg-slate-900 object-cover"
            playsInline
            muted
          />
        ) : null}
        {error ? (
          <p className="mt-3 rounded-md border border-danger/20 bg-danger/5 px-3 py-2 text-sm text-danger">
            {error}
          </p>
        ) : null}
      </Card>

      {view && outcome ? (
        <ResultPanel
          view={view}
          outcome={outcome}
          pending={pending}
          onConfirm={runCheckIn}
          onReset={resetScanner}
        />
      ) : (
        <Card className="flex items-center">
          <p className="text-sm text-slate-500">
            Scan a QR code to check someone in immediately, or paste a token and
            look them up first.
          </p>
        </Card>
      )}
    </div>
  );
}
