"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { QrCode, X } from "lucide-react";
import { mapPoiCategoryLabel } from "@/modules/venue/categories";
import { VenueMapCanvas, type MapPoiView } from "@/components/venue/venue-map-canvas";
import {
  resolveVenueCheckpoint,
  setAttendeeMapHere,
} from "@/modules/venue/attendee-actions";
import {
  detectQrFromVideo,
  isQrCameraAvailable,
  openQrCameraStream,
} from "@/lib/qr-camera";
import { Button } from "@/components/ui/button";

type Props = {
  eventId: string;
  eventName: string;
  imageUrl: string;
  pois: MapPoiView[];
  youAreHereId: string | null;
  youAreHereLabel: string | null;
  youAreHereAt: string | null;
  initialDestinationId: string | null;
};

/** Accept full /v/… URLs or opaque checkpoint tokens from printed QRs. */
function extractVenueToken(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  try {
    const url = new URL(trimmed);
    const match = url.pathname.match(/\/v\/([^/?#]+)/);
    if (match?.[1]) return decodeURIComponent(match[1]);
  } catch {
    // not a URL
  }
  const pathOnly = trimmed.match(/(?:^|\/)v\/([^/?#\s]+)/);
  if (pathOnly?.[1]) return decodeURIComponent(pathOnly[1]);
  if (/^[A-Za-z0-9_-]{16,}$/.test(trimmed)) return trimmed;
  return null;
}

export function AttendeeVenueMap({
  eventId,
  eventName,
  imageUrl,
  pois,
  youAreHereId,
  youAreHereLabel,
  youAreHereAt,
  initialDestinationId,
}: Props) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [destinationId, setDestinationId] = useState<string | null>(
    initialDestinationId,
  );
  const [hereId, setHereId] = useState<string | null>(youAreHereId);
  const [hereLabel, setHereLabel] = useState<string | null>(youAreHereLabel);
  const [hereAt, setHereAt] = useState<string | null>(youAreHereAt);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [cameraOn, setCameraOn] = useState(false);
  const [cameraSupported] = useState(() => isQrCameraAvailable());
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanning = useRef(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return pois;
    return pois.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        mapPoiCategoryLabel(p.category).toLowerCase().includes(q),
    );
  }, [pois, query]);

  const destination = pois.find((p) => p.id === destinationId) ?? null;

  useEffect(() => {
    if (!cameraOn) {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      scanning.current = false;
      return;
    }

    let cancelled = false;
    scanning.current = false;

    void (async () => {
      try {
        const stream = await openQrCameraStream();
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        await video.play();

        const tick = async () => {
          if (cancelled || !videoRef.current || scanning.current) return;
          const value = await detectQrFromVideo(videoRef.current);
          if (value) {
            scanning.current = true;
            await handleScannedPayload(value);
            return;
          }
          requestAnimationFrame(() => {
            void tick();
          });
        };
        requestAnimationFrame(() => {
          void tick();
        });
      } catch {
        if (!cancelled) {
          setMessage("Could not open the camera. Check permissions and try again.");
          setCameraOn(false);
        }
      }
    })();

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- scanner lifecycle tied to cameraOn
  }, [cameraOn]);

  async function handleScannedPayload(raw: string) {
    const token = extractVenueToken(raw);
    setCameraOn(false);
    if (!token) {
      setMessage("That QR is not a venue checkpoint. Look for a Bizcon floor QR.");
      scanning.current = false;
      return;
    }
    setPending(true);
    setMessage(null);
    const result = await resolveVenueCheckpoint(token);
    setPending(false);
    if (!result.ok) {
      setMessage(result.error);
      scanning.current = false;
      return;
    }
    if (result.data.eventId !== eventId) {
      setMessage("That QR belongs to a different event.");
      scanning.current = false;
      return;
    }
    const poi = result.data.poiId
      ? pois.find((p) => p.id === result.data.poiId)
      : null;
    if (poi) {
      setHereId(poi.id);
      setHereLabel(poi.name);
    } else {
      setHereLabel("Venue checkpoint");
    }
    setHereAt(new Date().toISOString());
    router.refresh();
    scanning.current = false;
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[0.71875rem] font-semibold uppercase tracking-[0.04em] text-indigo-600">
            {eventName}
          </p>
          <h1 className="mt-0.5 text-2xl font-semibold tracking-[-0.02em] text-slate-900 sm:text-[1.75rem]">
            Venue map
          </h1>
        </div>
        {cameraSupported ? (
          <Button
            type="button"
            size="sm"
            leadingIcon={<QrCode className="size-4" strokeWidth={1.75} aria-hidden />}
            disabled={pending}
            onClick={() => {
              setMessage(null);
              setCameraOn(true);
            }}
          >
            Scan floor QR
          </Button>
        ) : null}
      </div>

      <div className="rounded-xl bg-white px-4 py-3 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0 text-sm text-slate-700">
            {hereLabel ? (
              <p>
                <span className="font-semibold text-indigo-600">You are here:</span>{" "}
                {hereLabel}
                {hereAt ? (
                  <span className="text-slate-400">
                    {" "}
                    · {new Date(hereAt).toLocaleTimeString()}
                  </span>
                ) : null}
              </p>
            ) : (
              <p className="text-slate-600">
                Scan a floor QR or tap a place and choose{" "}
                <span className="font-medium text-slate-800">I&apos;m here</span>.
              </p>
            )}
            {destination ? (
              <p className="mt-0.5">
                <span className="font-semibold text-teal-700">Going to:</span>{" "}
                {destination.name}
              </p>
            ) : null}
          </div>
          {!cameraSupported ? (
            <p className="text-xs text-slate-500">
              Use your phone camera on a printed floor QR, or open the link it
              contains.
            </p>
          ) : null}
        </div>
        {message ? (
          <p className="mt-2 text-sm text-rose-600">{message}</p>
        ) : null}
      </div>

      {cameraOn ? (
        <div className="overflow-hidden rounded-xl bg-slate-900 shadow-sm">
          <div className="flex items-center justify-between px-4 py-2">
            <p className="text-sm font-medium text-white">Point at a floor QR</p>
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/20"
              onClick={() => setCameraOn(false)}
            >
              <X className="size-3.5" aria-hidden />
              Close
            </button>
          </div>
          <video
            ref={videoRef}
            className="aspect-[4/3] w-full bg-black object-cover"
            playsInline
            muted
          />
        </div>
      ) : (
        <VenueMapCanvas
          imageUrl={imageUrl}
          pois={pois}
          youAreHereId={hereId}
          destinationId={destinationId}
          onSelectPoi={(poi) => setDestinationId(poi.id)}
          compactControls
        />
      )}

      <div className="rounded-xl bg-white p-4 shadow-sm">
        <label className="sr-only" htmlFor="map-search">
          Search locations
        </label>
        <input
          id="map-search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search rooms, toilets, coffee…"
          className="w-full rounded-full border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
        />

        <div className="mt-3 flex flex-wrap gap-2">
          {(["toilet", "coffee", "exit", "registration"] as const).map((cat) => (
            <button
              key={cat}
              type="button"
              className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200"
              onClick={() => setQuery(mapPoiCategoryLabel(cat))}
            >
              {mapPoiCategoryLabel(cat)}
            </button>
          ))}
        </div>

        <ul className="mt-3 max-h-56 space-y-1 overflow-y-auto">
          {filtered.map((poi) => (
            <li key={poi.id}>
              <div className="flex items-center justify-between gap-2 rounded-lg px-2 py-2 hover:bg-slate-50">
                <button
                  type="button"
                  className="min-w-0 flex-1 text-left"
                  onClick={() => setDestinationId(poi.id)}
                >
                  <p className="truncate text-sm font-medium text-slate-900">
                    {poi.name}
                  </p>
                  <p className="text-xs text-slate-500">
                    {mapPoiCategoryLabel(poi.category)}
                  </p>
                </button>
                <div className="flex shrink-0 gap-1">
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    disabled={pending}
                    onClick={async () => {
                      setPending(true);
                      setMessage(null);
                      const result = await setAttendeeMapHere(eventId, poi.id);
                      setPending(false);
                      if (!result.ok) {
                        setMessage(result.error);
                        return;
                      }
                      setHereId(poi.id);
                      setHereLabel(poi.name);
                      setHereAt(new Date().toISOString());
                    }}
                  >
                    I&apos;m here
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => setDestinationId(poi.id)}
                  >
                    Go
                  </Button>
                </div>
              </div>
            </li>
          ))}
          {filtered.length === 0 ? (
            <li className="px-2 py-3 text-sm text-slate-500">No matches.</li>
          ) : null}
        </ul>
      </div>

      <p className="text-center text-xs text-slate-400">
        <Link href={`/me/events/${eventId}`} className="text-indigo-600">
          Back to event
        </Link>
      </p>
    </div>
  );
}
