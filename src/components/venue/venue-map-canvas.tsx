"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { mapPoiCategoryLabel } from "@/modules/venue/categories";
import { cn } from "@/lib/utils";

export type MapPoiView = {
  id: string;
  name: string;
  category: string;
  description?: string | null;
  x: number;
  y: number;
};

type Props = {
  imageUrl: string;
  pois: MapPoiView[];
  youAreHereId?: string | null;
  destinationId?: string | null;
  /** When set, clicking the map (not a pin) reports normalized coords. */
  onMapClick?: (x: number, y: number) => void;
  onSelectPoi?: (poi: MapPoiView) => void;
  /** Organiser: drag pins to correct placement; called on pointer up. */
  onMovePoi?: (poi: MapPoiView, x: number, y: number) => void;
  className?: string;
  /** Tighter zoom toolbar for attendee mobile layout. */
  compactControls?: boolean;
};

function clamp01(n: number) {
  return Math.min(1, Math.max(0, n));
}

function coordsFromEvent(
  layer: HTMLElement,
  clientX: number,
  clientY: number,
) {
  const rect = layer.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return null;
  return {
    x: clamp01((clientX - rect.left) / rect.width),
    y: clamp01((clientY - rect.top) / rect.height),
  };
}

export function VenueMapCanvas({
  imageUrl,
  pois,
  youAreHereId,
  destinationId,
  onMapClick,
  onSelectPoi,
  onMovePoi,
  className,
  compactControls = false,
}: Props) {
  const layerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [drag, setDrag] = useState<{
    id: string;
    x: number;
    y: number;
    moved: boolean;
  } | null>(null);
  const dragRef = useRef(drag);
  dragRef.current = drag;

  const markers = useMemo(() => {
    if (!drag) return pois;
    return pois.map((p) =>
      p.id === drag.id ? { ...p, x: drag.x, y: drag.y } : p,
    );
  }, [pois, drag]);

  useEffect(() => {
    if (!drag || !onMovePoi) return;

    function onPointerMove(e: PointerEvent) {
      const layer = layerRef.current;
      const current = dragRef.current;
      if (!layer || !current) return;
      const next = coordsFromEvent(layer, e.clientX, e.clientY);
      if (!next) return;
      const moved =
        current.moved ||
        Math.hypot(next.x - current.x, next.y - current.y) > 0.004;
      setDrag({ id: current.id, x: next.x, y: next.y, moved });
    }

    function onPointerUp() {
      const current = dragRef.current;
      const poi = pois.find((p) => p.id === current?.id);
      if (!current || !poi || !onMovePoi) {
        setDrag(null);
        return;
      }
      if (current.moved) {
        // Notify parent first so optimistic coords land before drag overlay clears.
        onMovePoi(poi, current.x, current.y);
        setDrag(null);
      } else {
        setDrag(null);
        onSelectPoi?.(poi);
      }
    }

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
    };
  }, [drag, onMovePoi, onSelectPoi, pois]);

  function handleClick(e: React.MouseEvent<HTMLDivElement>) {
    if (!onMapClick || drag) return;
    const layer = layerRef.current;
    if (!layer) return;
    const next = coordsFromEvent(layer, e.clientX, e.clientY);
    if (!next) return;
    onMapClick(next.x, next.y);
  }

  return (
    <div className={cn(compactControls ? "space-y-2" : "space-y-3", className)}>
      <div className="flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-200"
          onClick={() => setScale((s) => Math.max(0.6, Number((s - 0.2).toFixed(2))))}
        >
          −
        </button>
        <button
          type="button"
          className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-200"
          onClick={() => setScale((s) => Math.min(2.5, Number((s + 0.2).toFixed(2))))}
        >
          +
        </button>
        <button
          type="button"
          className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-200"
          onClick={() => setScale(1)}
        >
          Reset
        </button>
        <span className="text-xs text-slate-400">{Math.round(scale * 100)}%</span>
        {onMovePoi ? (
          <span className="text-xs text-slate-500">
            Drag pins to adjust · click empty map to add
          </span>
        ) : null}
      </div>
      <div className="max-h-[min(62vh,520px)] overflow-auto rounded-xl bg-slate-100 shadow-sm">
        <div
          ref={layerRef}
          className={cn(
            "relative origin-top-left transition-transform",
            onMapClick ? "cursor-crosshair" : "cursor-grab",
            drag ? "cursor-grabbing select-none" : null,
          )}
          style={{
            width: `${scale * 100}%`,
            minWidth: "100%",
          }}
          onClick={handleClick}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl}
            alt="Venue floor plan"
            className="block w-full select-none"
            draggable={false}
          />
          {markers.map((poi) => {
            const here = poi.id === youAreHereId;
            const dest = poi.id === destinationId;
            const isDragging = drag?.id === poi.id;
            const canDrag = Boolean(onMovePoi) && !poi.id.startsWith("proposal-");
            return (
              <button
                key={poi.id}
                type="button"
                title={
                  canDrag
                    ? `${poi.name} · drag to move`
                    : `${poi.name} · ${mapPoiCategoryLabel(poi.category)}`
                }
                className={cn(
                  "absolute z-10 flex -translate-x-1/2 -translate-y-full flex-col items-center touch-none",
                  canDrag
                    ? "cursor-grab active:cursor-grabbing"
                    : onSelectPoi
                      ? "cursor-pointer"
                      : "cursor-default",
                  isDragging ? "z-20 opacity-90" : null,
                )}
                style={{ left: `${poi.x * 100}%`, top: `${poi.y * 100}%` }}
                onClick={(ev) => {
                  ev.stopPropagation();
                  if (canDrag) return;
                  onSelectPoi?.(poi);
                }}
                onPointerDown={(ev) => {
                  if (!canDrag || !onMovePoi) return;
                  ev.preventDefault();
                  ev.stopPropagation();
                  setDrag({
                    id: poi.id,
                    x: poi.x,
                    y: poi.y,
                    moved: false,
                  });
                }}
              >
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[10px] font-semibold shadow-sm",
                    here
                      ? "bg-indigo-600 text-white"
                      : dest
                        ? "bg-teal-600 text-white"
                        : "bg-white text-slate-800",
                  )}
                >
                  {here ? "You" : dest ? "Go" : poi.name}
                </span>
                <span
                  className={cn(
                    "mt-0.5 size-3 rounded-full border-2 border-white shadow",
                    here
                      ? "bg-indigo-600"
                      : dest
                        ? "bg-teal-600"
                        : "bg-rose-500",
                  )}
                />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
