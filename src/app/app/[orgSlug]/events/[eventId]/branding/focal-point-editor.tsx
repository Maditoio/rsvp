"use client";

import { useCallback, useRef, useState } from "react";
import { Move } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

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
  disabled,
  onChange,
  /** Visual crop frame — banner strip vs tall hero */
  aspect = "banner",
  blur = 0,
}: {
  imageUrl: string;
  focalX: number;
  focalY: number;
  disabled?: boolean;
  onChange: (x: number, y: number) => void;
  aspect?: "banner" | "hero";
  blur?: number;
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
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11.5px] font-semibold uppercase tracking-[0.04em] text-slate-400">
            Photo position
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Drag the image to frame the important part. Use sliders for fine
            control.
          </p>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-1 text-[11px] font-semibold text-indigo-700">
          <Move className="size-3" strokeWidth={2} aria-hidden />
          Drag
        </span>
      </div>

      <div
        ref={frameRef}
        role="presentation"
        className={cn(
          "relative touch-none select-none overflow-hidden rounded-xl bg-slate-100 shadow-inner ring-1 ring-slate-200/80",
          aspect === "hero" ? "aspect-[3/4] max-h-[320px] w-full" : "aspect-[16/7]",
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
            transform: blur > 0 ? "scale(1.04)" : undefined,
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
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {PRESETS.map((p) => {
          const active =
            Math.abs(p.x - focalX) <= 3 && Math.abs(p.y - focalY) <= 3;
          return (
            <button
              key={p.id}
              type="button"
              disabled={disabled}
              onClick={() => onChange(p.x, p.y)}
              className={cn(
                "rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors duration-150",
                active
                  ? "bg-indigo-600 text-white shadow-[0_4px_12px_rgba(79,70,229,0.28)]"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200/80",
                disabled && "opacity-50",
              )}
            >
              {p.label}
            </button>
          );
        })}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <Label htmlFor="focal-x">Horizontal</Label>
            <span className="font-mono text-[11px] text-slate-400">{focalX}%</span>
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
          <div className="mb-1.5 flex items-center justify-between">
            <Label htmlFor="focal-y">Vertical</Label>
            <span className="font-mono text-[11px] text-slate-400">{focalY}%</span>
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
    </div>
  );
}
