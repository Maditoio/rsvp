"use client";

/**
 * Organiser check-in scanner.
 * Mount on `/app/[orgSlug]/events/[eventId]/check-in`.
 * Staff see only name, company, category, and check-in status — never email or notes.
 */
import { useEffect, useRef, useState, useTransition } from "react";
import {
  lookupCheckIn,
  performCheckIn,
} from "@/modules/checkin/actions";
import type { CheckInView } from "@/lib/authz/fields";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

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

export function CheckInScanner({
  orgSlug,
  eventId,
}: {
  orgSlug: string;
  eventId: string;
}) {
  const [token, setToken] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<CheckInView | null>(null);
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
        setError("Camera permission was denied.");
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
          start(async () => {
            try {
              setError(null);
              const result = await lookupCheckIn(orgSlug, eventId, raw);
              setView(result);
              setCameraOn(false);
            } catch (e) {
              setError(e instanceof Error ? e.message : "Scan failed");
              scanning.current = false;
            }
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
  }, [cameraOn, eventId, orgSlug]);

  function runLookup() {
    const raw = token.trim();
    if (!raw) {
      setError("Paste or scan an attendance token.");
      return;
    }
    setError(null);
    start(async () => {
      try {
        const result = await lookupCheckIn(orgSlug, eventId, raw);
        setView(result);
      } catch (e) {
        setView(null);
        setError(e instanceof Error ? e.message : "Lookup failed");
      }
    });
  }

  function runCheckIn() {
    const raw = token.trim();
    if (!raw) return;
    setError(null);
    start(async () => {
      try {
        const result = await performCheckIn(orgSlug, eventId, raw);
        setView(result);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Check-in failed");
      }
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
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
            {pending ? "Looking up…" : "Look up"}
          </Button>
          {cameraSupported ? (
            <Button
              type="button"
              variant="secondary"
              onClick={() => setCameraOn((v) => !v)}
            >
              {cameraOn ? "Stop camera" : "Scan with camera"}
            </Button>
          ) : (
            <p className="self-center text-xs text-gray-500">
              Camera QR scan is unavailable in this browser. Paste the token.
            </p>
          )}
        </div>
        {cameraOn ? (
          <video
            ref={videoRef}
            className="mt-4 w-full rounded-md bg-ink-900"
            playsInline
            muted
          />
        ) : null}
        {error ? <p className="mt-3 text-sm text-danger">{error}</p> : null}
      </Card>
      <Card>
        {view ? (
          <div>
            <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-md border border-stone-200 bg-bronze-100">
              <span className="h-2 w-2 rounded-full bg-bronze-500" />
            </div>
            <p className="font-display text-3xl text-ink-800">{view.name}</p>
            <p className="mt-2 text-stone-700">{view.company || "Company not listed"}</p>
            <p className="mt-1 text-sm text-stone-500">
              {view.category || "Uncategorised"}
            </p>
            <div className="mt-4">
              {view.alreadyCheckedIn ? (
                <Badge tone="warning">Already checked in</Badge>
              ) : (
                <Badge tone="muted">Not checked in</Badge>
              )}
            </div>
            {view.alreadyCheckedIn ? (
              <p className="mt-4 text-sm text-warning">
                Duplicate check-in blocked
                {view.checkedInAt
                  ? ` · ${new Date(view.checkedInAt).toLocaleString()}`
                  : ""}
                .
              </p>
            ) : (
              <Button
                type="button"
                className="mt-6"
                disabled={pending}
                onClick={runCheckIn}
              >
                Confirm check-in
              </Button>
            )}
          </div>
        ) : (
          <p className="text-sm text-stone-500">
            Look up a token to see name, company, category, and check-in status
            only.
          </p>
        )}
      </Card>
    </div>
  );
}
