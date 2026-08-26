"use client";

import { useMemo, useRef, useState } from "react";
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
  /** When set, clicking the map reports normalized coords (organiser place mode). */
  onMapClick?: (x: number, y: number) => void;
  onSelectPoi?: (poi: MapPoiView) => void;
  className?: string;
  /** Tighter zoom toolbar for attendee mobile layout. */
  compactControls?: boolean;
};

export function VenueMapCanvas({
  imageUrl,
  pois,
  youAreHereId,
  destinationId,
  onMapClick,
  onSelectPoi,
  className,
  compactControls = false,
}: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  const markers = useMemo(() => pois, [pois]);

  function handleClick(e: React.MouseEvent<HTMLDivElement>) {
    if (!onMapClick) return;
    const target = e.currentTarget;
    const rect = target.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    onMapClick(
      Math.min(1, Math.max(0, x)),
      Math.min(1, Math.max(0, y)),
    );
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
      </div>
      <div
        ref={wrapRef}
        className="max-h-[min(62vh,520px)] overflow-auto rounded-xl bg-slate-100 shadow-sm"
      >
        <div
          className={cn(
            "relative origin-top-left transition-transform",
            onMapClick ? "cursor-crosshair" : "cursor-grab",
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
            return (
              <button
                key={poi.id}
                type="button"
                title={`${poi.name} · ${mapPoiCategoryLabel(poi.category)}`}
                className={cn(
                  "absolute z-10 flex -translate-x-1/2 -translate-y-full flex-col items-center",
                  onSelectPoi ? "cursor-pointer" : "cursor-default",
                )}
                style={{ left: `${poi.x * 100}%`, top: `${poi.y * 100}%` }}
                onClick={(ev) => {
                  ev.stopPropagation();
                  onSelectPoi?.(poi);
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
