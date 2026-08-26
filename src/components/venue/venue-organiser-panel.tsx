"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createFloorPlanFromUpload,
  createMapCheckpoint,
  deleteMapPoi,
  disableMapCheckpoint,
  setFloorPlanPublished,
  upsertMapPoi,
} from "@/modules/venue/actions";
import {
  MAP_POI_CATEGORIES,
  MAP_POI_CATEGORY_LABELS,
  type MapPoiCategory,
} from "@/modules/venue/categories";
import { VenueMapCanvas } from "@/components/venue/venue-map-canvas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { QrCodeImage } from "@/components/qr-code";

type Poi = {
  id: string;
  name: string;
  category: string;
  description: string | null;
  x: number;
  y: number;
  meetingRoomId: string | null;
  sessionId: string | null;
};

type Checkpoint = {
  id: string;
  label: string;
  poiId: string | null;
  active: boolean;
};

type Room = { id: string; name: string };
type SessionOpt = { id: string; title: string };

export function VenueOrganiserPanel({
  orgSlug,
  eventId,
  aiFloorPlanEnabled = false,
  floorPlan,
  rooms,
  sessions,
}: {
  orgSlug: string;
  eventId: string;
  /** Platform-admin org flag — AI assist UI only when true. Manual flow always available. */
  aiFloorPlanEnabled?: boolean;
  floorPlan: {
    id: string;
    name: string;
    imageUrl: string;
    publishedAt: string | null;
    pois: Poi[];
    checkpoints: Checkpoint[];
  } | null;
  rooms: Room[];
  sessions: SessionOpt[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<{
    x: number;
    y: number;
    name: string;
    category: MapPoiCategory;
    meetingRoomId: string;
    sessionId: string;
  } | null>(null);
  const [checkpointLabel, setCheckpointLabel] = useState("Main entrance");
  const [checkpointPoiId, setCheckpointPoiId] = useState("");
  const [lastQr, setLastQr] = useState<{
    url: string;
    label: string;
    qrDataUrl: string;
  } | null>(null);

  if (!floorPlan) {
    return (
      <form
        className="max-w-lg space-y-4 rounded-xl bg-white p-6 shadow-sm"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          setError(null);
          start(async () => {
            const result = await createFloorPlanFromUpload(orgSlug, eventId, fd);
            if (!result.ok) {
              setError(result.error);
              return;
            }
            router.refresh();
          });
        }}
      >
        <h2 className="text-lg font-semibold text-slate-900">Upload floor plan</h2>
        <p className="text-sm text-slate-600">
          Start with a PNG, JPEG, or WebP from the venue (max 8 MB). You can add
          locations and QR checkpoints next.
        </p>
        <div>
          <Label htmlFor="name">Floor name</Label>
          <Input id="name" name="name" defaultValue="Main floor" className="mt-1.5" />
        </div>
        <div>
          <Label htmlFor="file">Image</Label>
          <Input
            id="file"
            name="file"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            required
            className="mt-1.5"
          />
        </div>
        {error ? <p className="text-sm text-rose-600">{error}</p> : null}
        <Button type="submit" disabled={pending}>
          {pending ? "Uploading…" : "Upload & continue"}
        </Button>
      </form>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-slate-500">{floorPlan.name}</p>
          <p className="text-sm text-slate-600">
            {floorPlan.publishedAt
              ? "Published — attendees can open Map."
              : "Draft — publish when ready."}
          </p>
        </div>
        <Button
          type="button"
          variant={floorPlan.publishedAt ? "secondary" : "primary"}
          disabled={pending}
          onClick={() => {
            setError(null);
            start(async () => {
              const result = await setFloorPlanPublished(
                orgSlug,
                eventId,
                floorPlan.id,
                !floorPlan.publishedAt,
              );
              if (!result.ok) setError(result.error);
              else router.refresh();
            });
          }}
        >
          {floorPlan.publishedAt ? "Unpublish" : "Publish map"}
        </Button>
      </div>

      {error ? <p className="text-sm text-rose-600">{error}</p> : null}

      {aiFloorPlanEnabled ? (
        <div className="rounded-xl bg-white p-5 shadow-sm">
          <p className="text-[0.71875rem] font-semibold uppercase tracking-[0.04em] text-indigo-600">
            AI assist
          </p>
          <h2 className="mt-1 text-lg font-semibold text-slate-900">
            Detect locations from the floor plan
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-slate-600">
            Upload an optional stand list (codes and names — no coordinates). AI
            will propose pins from the floor image for you to review. You can
            still place and edit locations manually below.
          </p>
          <div className="mt-4 flex flex-wrap items-end gap-3">
            <div className="min-w-[12rem] flex-1">
              <Label htmlFor="ai-stand-list">Stand list (optional)</Label>
              <Input
                id="ai-stand-list"
                type="file"
                accept=".csv,.xlsx,.xls,.pdf,text/csv,application/pdf"
                className="mt-1.5"
                disabled
              />
            </div>
            <Button type="button" disabled title="Coming soon">
              Detect locations
            </Button>
          </div>
          <p className="mt-2 text-xs text-slate-400">
            Detection will be enabled in a follow-up release. Your organisation
            already has this feature unlocked.
          </p>
        </div>
      ) : null}

      <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr]">
        <div className="rounded-xl bg-white p-4 shadow-sm">
          <p className="mb-3 text-sm text-slate-600">
            Click the map to place a location pin.
          </p>
          <VenueMapCanvas
            imageUrl={floorPlan.imageUrl}
            pois={floorPlan.pois}
            onMapClick={(x, y) =>
              setDraft({
                x,
                y,
                name: "",
                category: "information",
                meetingRoomId: "",
                sessionId: "",
              })
            }
            onSelectPoi={(poi) => {
              if (!confirm(`Delete “${poi.name}”?`)) return;
              start(async () => {
                const result = await deleteMapPoi(orgSlug, eventId, poi.id);
                if (!result.ok) setError(result.error);
                else router.refresh();
              });
            }}
          />
        </div>

        <div className="space-y-6">
          {draft ? (
            <div className="space-y-3 rounded-xl bg-white p-5 shadow-sm">
              <h3 className="font-semibold text-slate-900">New location</h3>
              <p className="text-xs text-slate-400">
                Position {(draft.x * 100).toFixed(0)}%, {(draft.y * 100).toFixed(0)}%
              </p>
              <div>
                <Label htmlFor="poi-name">Name</Label>
                <Input
                  id="poi-name"
                  className="mt-1.5"
                  value={draft.name}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="poi-cat">Category</Label>
                <select
                  id="poi-cat"
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                  value={draft.category}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      category: e.target.value as MapPoiCategory,
                    })
                  }
                >
                  {MAP_POI_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {MAP_POI_CATEGORY_LABELS[c]}
                    </option>
                  ))}
                </select>
              </div>
              {rooms.length > 0 ? (
                <div>
                  <Label htmlFor="poi-room">Link meeting room</Label>
                  <select
                    id="poi-room"
                    className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                    value={draft.meetingRoomId}
                    onChange={(e) =>
                      setDraft({ ...draft, meetingRoomId: e.target.value })
                    }
                  >
                    <option value="">None</option>
                    {rooms.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}
              {sessions.length > 0 ? (
                <div>
                  <Label htmlFor="poi-session">Link session</Label>
                  <select
                    id="poi-session"
                    className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                    value={draft.sessionId}
                    onChange={(e) =>
                      setDraft({ ...draft, sessionId: e.target.value })
                    }
                  >
                    <option value="">None</option>
                    {sessions.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.title}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}
              <div className="flex gap-2">
                <Button
                  type="button"
                  disabled={pending || !draft.name.trim()}
                  onClick={() => {
                    setError(null);
                    start(async () => {
                      const result = await upsertMapPoi(
                        orgSlug,
                        eventId,
                        floorPlan.id,
                        {
                          name: draft.name,
                          category: draft.category,
                          x: draft.x,
                          y: draft.y,
                          meetingRoomId: draft.meetingRoomId || null,
                          sessionId: draft.sessionId || null,
                        },
                      );
                      if (!result.ok) {
                        setError(result.error);
                        return;
                      }
                      setDraft(null);
                      router.refresh();
                    });
                  }}
                >
                  Save location
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setDraft(null)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : null}

          <div className="space-y-3 rounded-xl bg-white p-5 shadow-sm">
            <h3 className="font-semibold text-slate-900">QR checkpoints</h3>
            <p className="text-sm text-slate-600">
              Print these at physical spots. Scanning sets “You are here” on the
              attendee map.
            </p>
            <div>
              <Label htmlFor="cp-label">Label</Label>
              <Input
                id="cp-label"
                className="mt-1.5"
                value={checkpointLabel}
                onChange={(e) => setCheckpointLabel(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="cp-poi">Attach to location (optional)</Label>
              <select
                id="cp-poi"
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                value={checkpointPoiId}
                onChange={(e) => setCheckpointPoiId(e.target.value)}
              >
                <option value="">None</option>
                {floorPlan.pois.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <Button
              type="button"
              disabled={pending || !checkpointLabel.trim()}
              onClick={() => {
                setError(null);
                start(async () => {
                  const result = await createMapCheckpoint(
                    orgSlug,
                    eventId,
                    floorPlan.id,
                    {
                      label: checkpointLabel,
                      poiId: checkpointPoiId || null,
                    },
                  );
                  if (!result.ok) {
                    setError(result.error);
                    return;
                  }
                  setLastQr({
                    url: result.data.url,
                    label: checkpointLabel,
                    qrDataUrl: result.data.qrDataUrl,
                  });
                  router.refresh();
                });
              }}
            >
              Generate QR
            </Button>

            {lastQr ? (
              <div className="rounded-lg border border-slate-200 p-4 text-center">
                <p className="mb-2 text-sm font-medium text-slate-900">
                  {lastQr.label}
                </p>
                <div className="mx-auto inline-block">
                  <QrCodeImage dataUrl={lastQr.qrDataUrl} label={lastQr.label} />
                </div>
                <p className="mt-2 break-all text-xs text-slate-500">{lastQr.url}</p>
                <p className="mt-1 text-xs text-amber-700">
                  Print this sheet — the QR encodes a secure venue link.
                </p>
              </div>
            ) : null}

            <ul className="divide-y divide-slate-100 text-sm">
              {floorPlan.checkpoints.map((cp) => (
                <li
                  key={cp.id}
                  className="flex items-center justify-between gap-2 py-2"
                >
                  <span className={cp.active ? "text-slate-800" : "text-slate-400 line-through"}>
                    {cp.label}
                  </span>
                  {cp.active ? (
                    <button
                      type="button"
                      className="text-xs font-semibold text-rose-600"
                      onClick={() => {
                        start(async () => {
                          const result = await disableMapCheckpoint(
                            orgSlug,
                            eventId,
                            cp.id,
                          );
                          if (!result.ok) setError(result.error);
                          else router.refresh();
                        });
                      }}
                    >
                      Disable
                    </button>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <h3 className="font-semibold text-slate-900">Locations</h3>
            <ul className="mt-2 space-y-1 text-sm text-slate-600">
              {floorPlan.pois.length === 0 ? (
                <li>No locations yet — click the map to add one.</li>
              ) : (
                floorPlan.pois.map((p) => (
                  <li key={p.id}>
                    {p.name}{" "}
                    <span className="text-slate-400">
                      · {MAP_POI_CATEGORY_LABELS[p.category as MapPoiCategory] ?? p.category}
                    </span>
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
