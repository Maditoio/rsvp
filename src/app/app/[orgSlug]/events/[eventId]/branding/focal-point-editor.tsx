"use client";

import { useCallback, useRef, useState, type ReactNode } from "react";
import { Move } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import { parsePhotoZoom } from "@/modules/branding/cover-focal";
import { MoreOptions } from "./more-options";

const PRESETS: { id: string; label: string; x: number; y: number }[] = [
  { id: "tl", label: "Top left", x: 20, y: 20 },
  { id: "top", label: "Top", x: 50, y: 18 },
  { id: "tr", label: "Top right", x: 80, y: 20 },
  { id: "left", label: "Left", x: 18, y: 50 },
  { id: "center", label: "Center", x: 50, y: 50 },
  { id: "right", label: "Right", x: 82, y: 50 },
  { id: "bl", label: "Bottom left", x: 20, y: 80 },
  { id: "bottom", label: "Bottom", x: 50, y: 82 },
  { id: "br", label: "Bottom right", x: 80, y: 80 },
];

function clamp(n: number) {
  return Math.min(100, Math.max(0, Math.round(n)));
}

export function FocalPointEditor({
  imageUrl,
  focalX,
  focalY,
  zoom = 100,
  disabled,
  onChange,
  onZoomChange,
  /** Visual crop frame — banner strip vs tall hero */
  aspect = "banner",
  blur = 0,
  children,
}: {
  imageUrl: string;
  focalX: number;
  focalY: number;
  zoom?: number;
  disabled?: boolean;
  onChange: (x: number, y: number) => void;
  onZoomChange?: (zoom: number) => void;
  aspect?: "banner" | "hero";
  blur?: number;
  /** Extra controls shown inside the fine-tune disclosure. */
  children?: ReactNode;
}) {
  const frameRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  } | null>(null);
  const [dragging, setDragging] = useState(false);
  const zoomPct = parsePhotoZoom(zoom, 100);
  const scale = (zoomPct / 100) * (blur > 0 ? 1.04 : 1);

  const applyDelta = useCallback(
    (clientX: number, clientY: number) => {
      const drag = dragRef.current;
      const frame = frameRef.current;
      if (!drag || !frame) return;
      const rect = frame.getBoundingClientRect();
      if (rect.width < 1 || rect.height < 1) return;
      // Dragging the photo: move opposite to pointer so it feels like panning.
      const dxPct = ((clientX - drag.startX) / rect.width) * 100;
      const dyPct = ((clientY - drag.startY) / rect.height) * 100;
      onChange(clamp(drag.originX - dxPct), clamp(drag.originY - dyPct));
    },
    [onChange],
  );

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.04em] text-slate-400">
          Photo position
        </p>
        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-400">
          <Move className="size-3" strokeWidth={2} aria-hidden />
          Drag to frame
        </span>
      </div>

      <div
        ref={frameRef}
        role="presentation"
        className={cn(
          "relative touch-none select-none overflow-hidden rounded-xl bg-slate-100 shadow-inner ring-1 ring-slate-200/80",
          aspect === "hero"
            ? "aspect-[3/4] max-h-[320px] w-full"
            : "aspect-[16/7]",
          disabled ? "cursor-not-allowed opacity-60" : "cursor-grab",
          dragging && !disabled && "cursor-grabbing",
        )}
        onPointerDown={(e) => {
          if (disabled || e.button !== 0) return;
          e.preventDefault();
          (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
          dragRef.current = {
            pointerId: e.pointerId,
            startX: e.clientX,
            startY: e.clientY,
            originX: focalX,
            originY: focalY,
          };
          setDragging(true);
        }}
        onPointerMove={(e) => {
          if (!dragRef.current || dragRef.current.pointerId !== e.pointerId) {
            return;
          }
          e.preventDefault();
          applyDelta(e.clientX, e.clientY);
        }}
        onPointerUp={(e) => {
          if (dragRef.current?.pointerId === e.pointerId) {
            dragRef.current = null;
            setDragging(false);
          }
        }}
        onPointerCancel={() => {
          dragRef.current = null;
          setDragging(false);
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageUrl}
          alt=""
          draggable={false}
          className="pointer-events-none h-full w-full object-cover"
          style={{
            objectPosition: `${focalX}% ${focalY}%`,
            filter: blur > 0 ? `blur(${Math.min(blur, 10)}px)` : undefined,
            transform: `scale(${scale})`,
            transformOrigin: `${focalX}% ${focalY}%`,
          }}
        />

        {/* Rule-of-thirds guide while dragging */}
        <div
          className={cn(
            "pointer-events-none absolute inset-0 transition-opacity duration-150",
            dragging ? "opacity-100" : "opacity-0",
          )}
          aria-hidden
        >
          <div className="absolute inset-y-0 left-1/3 w-px bg-white/50" />
          <div className="absolute inset-y-0 left-2/3 w-px bg-white/50" />
          <div className="absolute inset-x-0 top-1/3 h-px bg-white/50" />
          <div className="absolute inset-x-0 top-2/3 h-px bg-white/50" />
        </div>

        {/* Focus reticle at frame centre — what stays framed */}
        <div
          className="pointer-events-none absolute left-1/2 top-1/2 size-10 -translate-x-1/2 -translate-y-1/2"
          aria-hidden
        >
          <span className="absolute inset-0 rounded-full border-2 border-white/90 shadow-[0_0_0_1px_rgba(15,23,42,0.25)]" />
          <span className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-white/80" />
          <span className="absolute left-0 top-1/2 h-px w-full -translate-y-1/2 bg-white/80" />
          <span className="absolute left-1/2 top-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-indigo-600 shadow-sm ring-2 ring-white" />
        </div>

        <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-900/45 to-transparent px-3 py-2">
          <p className="text-center text-[11px] font-medium text-white/95">
            {focalX}% · {focalY}%
            {zoomPct > 100 ? ` · ${zoomPct}%` : ""}
          </p>
        </div>
      </div>

      {onZoomChange ? (
        <div>
          <div className="mb-1 flex items-center justify-between">
            <Label htmlFor="photo-zoom" className="mb-0">
              Zoom
            </Label>
            <span className="font-mono text-[11px] tabular-nums text-slate-400">
              {zoomPct}%
            </span>
          </div>
          <Slider
            id="photo-zoom"
            min={100}
            max={200}
            step={1}
            value={zoomPct}
            disabled={disabled}
            onChange={(e) => onZoomChange(parsePhotoZoom(e.target.value, 100))}
          />
          <p className="mt-1.5 text-[11px] text-slate-400">
            Pull in tighter on the framed area. 100% fills the frame.
          </p>
        </div>
      ) : null}

      <MoreOptions label="Fine-tune" lessLabel="Hide fine-tune">
        <div
          role="group"
          aria-label="Position presets"
          className="grid grid-cols-3 gap-1 rounded-lg bg-slate-50 p-1"
        >
          {PRESETS.map((p) => {
            const active =
              Math.abs(p.x - focalX) <= 3 && Math.abs(p.y - focalY) <= 3;
            return (
              <button
                key={p.id}
                type="button"
                disabled={disabled}
                title={p.label}
                aria-label={p.label}
                aria-pressed={active}
                onClick={() => onChange(p.x, p.y)}
                className={cn(
                  "flex h-8 items-center justify-center rounded-md text-[10px] font-semibold transition-colors duration-150",
                  active
                    ? "bg-white text-indigo-700 shadow-sm ring-1 ring-indigo-200"
                    : "text-slate-500 hover:bg-white/80 hover:text-slate-800",
                  disabled && "opacity-50",
                )}
              >
                {p.label.replace(" ", "\u00a0")}
              </button>
            );
          })}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <div className="mb-1 flex items-center justify-between">
              <Label htmlFor="focal-x" className="mb-0">
                Horizontal
              </Label>
              <span className="font-mono text-[11px] tabular-nums text-slate-400">
                {focalX}%
              </span>
            </div>
            <Slider
              id="focal-x"
              min={0}
              max={100}
              step={1}
              value={focalX}
              disabled={disabled}
              onChange={(e) => onChange(Number(e.target.value), focalY)}
            />
          </div>
          <div>
            <div className="mb-1 flex items-center justify-between">
              <Label htmlFor="focal-y" className="mb-0">
                Vertical
              </Label>
              <span className="font-mono text-[11px] tabular-nums text-slate-400">
                {focalY}%
              </span>
            </div>
            <Slider
              id="focal-y"
              min={0}
              max={100}
              step={1}
              value={focalY}
              disabled={disabled}
              onChange={(e) => onChange(focalX, Number(e.target.value))}
            />
          </div>
        </div>
        {children}
      </MoreOptions>
    </div>
  );
}
