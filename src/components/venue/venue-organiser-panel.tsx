"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";
import {
  acceptDetectedPois,
  createFloorPlanFromUpload,
  createMapCheckpoint,
  deleteFloorPlan,
  deleteMapPoi,
  detectFloorPlanLocations,
  disableMapCheckpoint,
  downloadFloorCheckpointQrZip,
  setFloorPlanPublished,
  upsertMapPoi,
} from "@/modules/venue/actions";
import {
  isMapPoiCategory,
  MAP_POI_CATEGORIES,
  MAP_POI_CATEGORY_LABELS,
  type MapPoiCategory,
} from "@/modules/venue/categories";
import type { DetectedPoiProposal } from "@/modules/venue/types";
import { VenueMapCanvas } from "@/components/venue/venue-map-canvas";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { QrCodeImage } from "@/components/qr-code";
import { cn } from "@/lib/utils";

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

export type FloorPlanView = {
  id: string;
  name: string;
  floorIndex: number;
  imageUrl: string;
  publishedAt: string | null;
  pois: Poi[];
  checkpoints: Checkpoint[];
};

type Room = { id: string; name: string };
type SessionOpt = { id: string; title: string };

function FloorUploadForm({
  orgSlug,
  eventId,
  title,
  defaultName,
  pending,
  error,
  onError,
  onUploaded,
  start,
}: {
  orgSlug: string;
  eventId: string;
  title: string;
  defaultName: string;
  pending: boolean;
  error: string | null;
  onError: (message: string | null) => void;
  onUploaded: (floorPlanId: string) => void;
  start: (fn: () => Promise<void> | void) => void;
}) {
  return (
    <form
      className="max-w-lg space-y-4 rounded-xl bg-white p-6 shadow-sm"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        onError(null);
        start(async () => {
          const result = await createFloorPlanFromUpload(orgSlug, eventId, fd);
          if (!result.ok) {
            onError(result.error);
            return;
          }
          onUploaded(result.data.floorPlanId);
        });
      }}
    >
      <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
      <p className="text-sm text-slate-600">
        PNG, JPEG, or WebP from the venue (max 8 MB). Add locations and QR
        checkpoints after upload.
      </p>
      <div>
        <Label htmlFor="floor-name">Floor name</Label>
        <Input
          id="floor-name"
          name="name"
          defaultValue={defaultName}
          className="mt-1.5"
        />
      </div>
      <div>
        <Label htmlFor="floor-file">Image</Label>
        <Input
          id="floor-file"
          name="file"
          type="file"
          accept="image/png,image/jpeg,image/webp"
          required
          className="mt-1.5"
        />
      </div>
      {error ? <p className="text-sm text-rose-600">{error}</p> : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Uploading…" : "Upload floor"}
      </Button>
    </form>
  );
}

export function VenueOrganiserPanel({
  orgSlug,
  eventId,
  aiFloorPlanEnabled = false,
  floorPlans,
  initialFloorPlanId,
  rooms,
  sessions,
}: {
  orgSlug: string;
  eventId: string;
  aiFloorPlanEnabled?: boolean;
  floorPlans: FloorPlanView[];
  initialFloorPlanId?: string | null;
  rooms: Room[];
  sessions: SessionOpt[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [addingFloor, setAddingFloor] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(
    initialFloorPlanId ?? floorPlans[0]?.id ?? null,
  );
  const [draft, setDraft] = useState<{
    id?: string;
    x: number;
    y: number;
    name: string;
    category: MapPoiCategory;
    meetingRoomId: string;
    sessionId: string;
  } | null>(null);
  const [checkpointLabel, setCheckpointLabel] = useState("");
  const [checkpointLabelDirty, setCheckpointLabelDirty] = useState(false);
  const [checkpointPoiId, setCheckpointPoiId] = useState("");
  const [lastQr, setLastQr] = useState<{
    url: string;
    label: string;
    qrDataUrl: string;
  } | null>(null);
  const [proposals, setProposals] = useState<DetectedPoiProposal[] | null>(null);
  const [selectedProposalKeys, setSelectedProposalKeys] = useState<Set<string>>(
    new Set(),
  );
  const [detecting, setDetecting] = useState(false);
  const [standListFile, setStandListFile] = useState<File | null>(null);
  /** Optimistic pin positions so drag-save never snaps back while the server catches up. */
  const [positionOverrides, setPositionOverrides] = useState<
    Record<string, { x: number; y: number }>
  >({});

  useEffect(() => {
    if (floorPlans.length === 0) {
      setSelectedId(null);
      return;
    }
    if (!selectedId || !floorPlans.some((f) => f.id === selectedId)) {
      setSelectedId(initialFloorPlanId ?? floorPlans[0]!.id);
    }
  }, [floorPlans, selectedId, initialFloorPlanId]);

  const floorPlan = useMemo(
    () => floorPlans.find((f) => f.id === selectedId) ?? null,
    [floorPlans, selectedId],
  );

  // Drop overrides once server props match (e.g. after another action refreshes).
  useEffect(() => {
    if (!floorPlan) return;
    setPositionOverrides((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const [id, pos] of Object.entries(prev)) {
        const server = floorPlan.pois.find((p) => p.id === id);
        if (!server) {
          delete next[id];
          changed = true;
          continue;
        }
        if (
          Math.abs(server.x - pos.x) < 0.0005 &&
          Math.abs(server.y - pos.y) < 0.0005
        ) {
          delete next[id];
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [floorPlan]);

  const displayPois = useMemo(() => {
    if (!floorPlan) return [];
    return floorPlan.pois.map((p) => {
      const o = positionOverrides[p.id];
      return o ? { ...p, x: o.x, y: o.y } : p;
    });
  }, [floorPlan, positionOverrides]);

  const proposalKey = (p: DetectedPoiProposal, index: number) =>
    `${p.name}|${p.x.toFixed(4)}|${p.y.toFixed(4)}|${index}`;

  if (floorPlans.length === 0 || addingFloor) {
    return (
      <div className="space-y-4">
        {floorPlans.length > 0 ? (
          <Button
            type="button"
            variant="ghost"
            onClick={() => setAddingFloor(false)}
          >
            Cancel
          </Button>
        ) : null}
        <FloorUploadForm
          orgSlug={orgSlug}
          eventId={eventId}
          title={floorPlans.length === 0 ? "Upload floor plan" : "Add another floor"}
          defaultName={
            floorPlans.length === 0
              ? "Main floor"
              : `Floor ${floorPlans.length + 1}`
          }
          pending={pending}
          error={error}
          onError={setError}
          start={start}
          onUploaded={(id) => {
            setAddingFloor(false);
            setSelectedId(id);
            router.refresh();
          }}
        />
      </div>
    );
  }

  if (!floorPlan) return null;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center gap-2">
        {floorPlans.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => {
              setSelectedId(f.id);
              setDraft(null);
              setProposals(null);
              setLastQr(null);
              setError(null);
              setPositionOverrides({});
            }}
            className={
              f.id === floorPlan.id
                ? "rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white"
                : "rounded-full bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
            }
          >
            {f.name}
            {f.publishedAt ? "" : " · draft"}
          </button>
        ))}
        <Button
          type="button"
          variant="secondary"
          onClick={() => {
            setAddingFloor(true);
            setError(null);
          }}
        >
          Add floor
        </Button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-slate-500">{floorPlan.name}</p>
          <p className="text-sm text-slate-600">
            {floorPlan.publishedAt
              ? "Published — attendees can open this floor."
              : "Draft — publish when ready."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="ghost"
            disabled={pending}
            onClick={() => {
              if (
                !confirm(
                  `Delete “${floorPlan.name}” and all its locations/QRs?`,
                )
              ) {
                return;
              }
              setError(null);
              start(async () => {
                const result = await deleteFloorPlan(
                  orgSlug,
                  eventId,
                  floorPlan.id,
                );
                if (!result.ok) {
                  setError(result.error);
                  return;
                }
                setSelectedId(null);
                router.refresh();
              });
            }}
          >
            Delete floor
          </Button>
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
            {floorPlan.publishedAt ? "Unpublish" : "Publish floor"}
          </Button>
        </div>
      </div>

      {error ? <p className="text-sm text-rose-600">{error}</p> : null}

      {aiFloorPlanEnabled ? (
        <div className="rounded-xl bg-white p-5 shadow-sm">
          <div className="flex items-start gap-2">
            <span
              className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-indigo-50"
              aria-hidden
            >
              <Sparkles
                className={cn(
                  "size-4 text-indigo-600",
                  detecting && "concierge-sparkle",
                )}
                strokeWidth={1.75}
              />
            </span>
            <div className="min-w-0">
              <p className="text-[0.71875rem] font-semibold uppercase tracking-[0.04em] text-indigo-600">
                Con·cierge AI
              </p>
              <h2 className="mt-1 text-lg font-semibold text-slate-900">
                Map this floor
              </h2>
              <p className="mt-1 max-w-2xl text-sm text-slate-600">
                Con·cierge reads the floor image (and optional stand CSV) and
                proposes pins for you to review. You can still place and drag
                locations manually.
              </p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-end gap-3">
            <div className="min-w-[12rem] flex-1">
              <Label htmlFor="ai-stand-list">Stand list (optional CSV)</Label>
              <Input
                id="ai-stand-list"
                type="file"
                accept=".csv,.txt,text/csv,text/plain"
                className="mt-1.5"
                onChange={(e) =>
                  setStandListFile(e.target.files?.[0] ?? null)
                }
              />
            </div>
            <Button
              type="button"
              disabled={pending || detecting}
              leadingIcon={
                <Sparkles
                  className={cn(
                    "size-4",
                    detecting && "concierge-sparkle",
                  )}
                  strokeWidth={1.75}
                  aria-hidden
                />
              }
              onClick={() => {
                setError(null);
                setDetecting(true);
                start(async () => {
                  const fd = new FormData();
                  if (standListFile) fd.set("standList", standListFile);
                  const result = await detectFloorPlanLocations(
                    orgSlug,
                    eventId,
                    floorPlan.id,
                    fd,
                  );
                  setDetecting(false);
                  if (!result.ok) {
                    setError(result.error);
                    return;
                  }
                  setProposals(result.data.proposals);
                  setSelectedProposalKeys(
                    new Set(
                      result.data.proposals.map((p, i) => proposalKey(p, i)),
                    ),
                  );
                });
              }}
            >
              {detecting ? "Con·cierge is mapping…" : "Detect with Con·cierge"}
            </Button>
          </div>
          {detecting ? (
            <p className="mt-2 text-xs text-indigo-600" aria-live="polite">
              <span className="font-medium">Con·cierge AI</span> is reading the
              floor plan…
            </p>
          ) : null}

          {proposals ? (
            <div className="mt-5 space-y-3 border-t border-slate-100 pt-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm text-slate-600">
                  {proposals.length === 0
                    ? "Con·cierge found no new locations (or all matched existing pins)."
                    : `Con·cierge proposed ${proposals.length} · ${selectedProposalKeys.size} selected`}
                </p>
                {proposals.length > 0 ? (
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() =>
                        setSelectedProposalKeys(
                          new Set(proposals.map((p, i) => proposalKey(p, i))),
                        )
                      }
                    >
                      Select all
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setSelectedProposalKeys(new Set())}
                    >
                      Clear
                    </Button>
                    <Button
                      type="button"
                      disabled={pending || selectedProposalKeys.size === 0}
                      onClick={() => {
                        const chosen = proposals.filter((p, i) =>
                          selectedProposalKeys.has(proposalKey(p, i)),
                        );
                        setError(null);
                        start(async () => {
                          const result = await acceptDetectedPois(
                            orgSlug,
                            eventId,
                            floorPlan.id,
                            { proposals: chosen },
                          );
                          if (!result.ok) {
                            setError(result.error);
                            return;
                          }
                          setProposals(null);
                          setSelectedProposalKeys(new Set());
                          router.refresh();
                        });
                      }}
                    >
                      Add selected
                    </Button>
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setProposals(null)}
                  >
                    Dismiss
                  </Button>
                )}
              </div>
              {proposals.length > 0 ? (
                <ul className="max-h-64 space-y-2 overflow-y-auto rounded-lg border border-slate-200 p-3">
                  {proposals.map((p, index) => {
                    const key = proposalKey(p, index);
                    const checked = selectedProposalKeys.has(key);
                    const id = `proposal-${index}`;
                    return (
                      <li key={key} className="flex items-start gap-3 text-sm">
                        <Checkbox
                          id={id}
                          checked={checked}
                          onChange={(e) => {
                            setSelectedProposalKeys((prev) => {
                              const next = new Set(prev);
                              if (e.target.checked) next.add(key);
                              else next.delete(key);
                              return next;
                            });
                          }}
                        />
                        <Label htmlFor={id} className="cursor-pointer font-normal">
                          <span className="font-medium text-slate-900">
                            {p.name}
                          </span>
                          <span className="text-slate-500">
                            {" "}
                            ·{" "}
                            {MAP_POI_CATEGORY_LABELS[p.category] ?? p.category}
                            {p.standCode ? ` · ${p.standCode}` : ""} ·{" "}
                            {(p.x * 100).toFixed(0)}%,{(p.y * 100).toFixed(0)}%
                          </span>
                        </Label>
                      </li>
                    );
                  })}
                </ul>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr]">
        <div className="rounded-xl bg-white p-4 shadow-sm">
          <p className="mb-3 text-sm text-slate-600">
            Drag pins to the correct spot. Click empty map to add a location;
            click a pin to edit or delete it.
          </p>
          <VenueMapCanvas
            imageUrl={floorPlan.imageUrl}
            pois={[
              ...displayPois,
              ...(proposals ?? [])
                .filter((p, i) => selectedProposalKeys.has(proposalKey(p, i)))
                .map((p, i) => ({
                  id: `proposal-${i}`,
                  name: p.name,
                  category: p.category,
                  description: null,
                  x: p.x,
                  y: p.y,
                })),
            ]}
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
              if (poi.id.startsWith("proposal-")) return;
              const existing = displayPois.find((p) => p.id === poi.id);
              if (!existing) return;
              setDraft({
                id: existing.id,
                x: existing.x,
                y: existing.y,
                name: existing.name,
                category: (isMapPoiCategory(existing.category)
                  ? existing.category
                  : "information") as MapPoiCategory,
                meetingRoomId: existing.meetingRoomId ?? "",
                sessionId: existing.sessionId ?? "",
              });
            }}
            onMovePoi={(poi, x, y) => {
              if (poi.id.startsWith("proposal-")) return;
              const existing = displayPois.find((p) => p.id === poi.id);
              if (!existing) return;
              const previous = { x: existing.x, y: existing.y };

              // Keep the pin where it was dropped — no wait for server / refresh.
              setPositionOverrides((prev) => ({
                ...prev,
                [existing.id]: { x, y },
              }));
              setDraft((d) =>
                d?.id === existing.id ? { ...d, x, y } : d,
              );
              setError(null);

              void (async () => {
                const result = await upsertMapPoi(
                  orgSlug,
                  eventId,
                  floorPlan.id,
                  {
                    id: existing.id,
                    name: existing.name,
                    category: isMapPoiCategory(existing.category)
                      ? existing.category
                      : "information",
                    description: existing.description,
                    x,
                    y,
                    meetingRoomId: existing.meetingRoomId,
                    sessionId: existing.sessionId,
                  },
                );
                if (!result.ok) {
                  setPositionOverrides((prev) => ({
                    ...prev,
                    [existing.id]: previous,
                  }));
                  setDraft((d) =>
                    d?.id === existing.id
                      ? { ...d, x: previous.x, y: previous.y }
                      : d,
                  );
                  setError(result.error);
                }
              })();
            }}
          />
        </div>

        <div className="space-y-6">
          {draft ? (
            <div className="space-y-3 rounded-xl bg-white p-5 shadow-sm">
              <h3 className="font-semibold text-slate-900">
                {draft.id ? "Edit location" : "New location"}
              </h3>
              <p className="text-xs text-slate-400">
                Position {(draft.x * 100).toFixed(0)}%, {(draft.y * 100).toFixed(0)}%
                {draft.id ? " · drag the pin on the map to move" : ""}
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
              <div className="flex flex-wrap gap-2">
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
                          id: draft.id,
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
                  {draft.id ? "Save changes" : "Save location"}
                </Button>
                {draft.id ? (
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={pending}
                    onClick={() => {
                      if (!confirm(`Delete “${draft.name}”?`)) return;
                      setError(null);
                      start(async () => {
                        const result = await deleteMapPoi(
                          orgSlug,
                          eventId,
                          draft.id!,
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
                    Delete
                  </Button>
                ) : null}
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
              Attach a location — the print label fills in automatically. Edit
              the label if you want a different name on the sheet.
            </p>
            <div>
              <Label htmlFor="cp-poi">Location</Label>
              <select
                id="cp-poi"
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                value={checkpointPoiId}
                onChange={(e) => {
                  const id = e.target.value;
                  setCheckpointPoiId(id);
                  const poi = floorPlan.pois.find((p) => p.id === id);
                  if (!poi) return;
                  if (!checkpointLabelDirty) {
                    setCheckpointLabel(poi.name);
                  }
                }}
              >
                <option value="">Select a location…</option>
                {floorPlan.pois.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ·{" "}
                    {MAP_POI_CATEGORY_LABELS[p.category as MapPoiCategory] ??
                      p.category}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="cp-label">Print label</Label>
              <Input
                id="cp-label"
                className="mt-1.5"
                value={checkpointLabel}
                placeholder="Fills from the location name"
                onChange={(e) => {
                  setCheckpointLabelDirty(true);
                  setCheckpointLabel(e.target.value);
                }}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                disabled={
                  pending ||
                  (!checkpointPoiId && !checkpointLabel.trim())
                }
                onClick={() => {
                  setError(null);
                  start(async () => {
                    const result = await createMapCheckpoint(
                      orgSlug,
                      eventId,
                      floorPlan.id,
                      {
                        label: checkpointLabel.trim() || null,
                        poiId: checkpointPoiId || null,
                      },
                    );
                    if (!result.ok) {
                      setError(result.error);
                      return;
                    }
                    setLastQr({
                      url: result.data.url,
                      label: result.data.label,
                      qrDataUrl: result.data.qrDataUrl,
                    });
                    setCheckpointLabelDirty(false);
                    router.refresh();
                  });
                }}
              >
                Generate QR
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={pending || floorPlan.checkpoints.every((c) => !c.active)}
                onClick={() => {
                  setError(null);
                  start(async () => {
                    const result = await downloadFloorCheckpointQrZip(
                      orgSlug,
                      eventId,
                      floorPlan.id,
                    );
                    if (!result.ok) {
                      setError(result.error);
                      return;
                    }
                    const binary = atob(result.data.base64);
                    const bytes = new Uint8Array(binary.length);
                    for (let i = 0; i < binary.length; i++) {
                      bytes[i] = binary.charCodeAt(i);
                    }
                    const blob = new Blob([bytes], { type: "application/zip" });
                    const href = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = href;
                    a.download = result.data.fileName;
                    a.click();
                    URL.revokeObjectURL(href);
                    if (result.data.skipped > 0) {
                      setError(
                        `Downloaded ${result.data.included} QR(s). ${result.data.skipped} older checkpoint(s) need regenerating before they can be included.`,
                      );
                    }
                  });
                }}
              >
                Download print sheets (ZIP)
              </Button>
            </div>

            {lastQr ? (
              <div className="rounded-lg border border-slate-200 p-4 text-center">
                <div className="mx-auto inline-block">
                  <QrCodeImage dataUrl={lastQr.qrDataUrl} label={lastQr.label} />
                </div>
                <p className="mt-2 break-all text-xs text-slate-500">{lastQr.url}</p>
                <p className="mt-1 text-xs text-amber-700">
                  Print this card — the label sits above the QR for venue staff.
                </p>
              </div>
            ) : null}

            <ul className="divide-y divide-slate-100 text-sm">
              {floorPlan.checkpoints.map((cp) => (
                <li
                  key={cp.id}
                  className="flex items-center justify-between gap-2 py-2"
                >
                  <span
                    className={
                      cp.active ? "text-slate-800" : "text-slate-400 line-through"
                    }
                  >
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
                <li>No locations yet — click the map or ask Con·cierge.</li>
              ) : (
                floorPlan.pois.map((p) => (
                  <li key={p.id}>
                    {p.name}{" "}
                    <span className="text-slate-400">
                      ·{" "}
                      {MAP_POI_CATEGORY_LABELS[p.category as MapPoiCategory] ??
                        p.category}
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
