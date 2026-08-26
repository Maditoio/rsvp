"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import type { VenueHeatmapData } from "@/modules/venue/insights";
import { cn } from "@/lib/utils";

type Props = {
  heatmap: VenueHeatmapData;
};

/** Map normalized weight 0–1 to heat colour (teal → amber → rose). */
function heatColor(t: number): string {
  const clamped = Math.min(1, Math.max(0, t));
  if (clamped < 0.5) {
    const u = clamped / 0.5;
    const r = Math.round(20 + u * (245 - 20));
    const g = Math.round(184 + u * (158 - 184));
    const b = Math.round(166 + u * (11 - 166));
    return `rgb(${r}, ${g}, ${b})`;
  }
  const u = (clamped - 0.5) / 0.5;
  const r = Math.round(245 + u * (244 - 245));
  const g = Math.round(158 + u * (63 - 158));
  const b = Math.round(11 + u * (94 - 11));
  return `rgb(${r}, ${g}, ${b})`;
}

function heatRgba(t: number, alpha: number): string {
  const rgb = heatColor(t);
  const match = rgb.match(/\d+/g);
  if (!match) return `rgba(20, 184, 166, ${alpha})`;
  return `rgba(${match[0]}, ${match[1]}, ${match[2]}, ${alpha})`;
}

function drawHeatOverlay(
  canvas: HTMLCanvasElement,
  width: number,
  height: number,
  points: { x: number; y: number; weight: number }[],
  maxWeight: number,
): void {
  if (width <= 0 || height <= 0) return;

  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  ctx.clearRect(0, 0, width, height);
  if (points.length === 0 || maxWeight <= 0) return;

  const minDim = Math.min(width, height);
  const baseRadius = minDim * 0.14;

  ctx.globalCompositeOperation = "lighter";

  for (const point of points) {
    const t = point.weight / maxWeight;
    const radius = baseRadius * (0.55 + 0.75 * Math.sqrt(t));
    const cx = point.x * width;
    const cy = point.y * height;

    const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
    gradient.addColorStop(0, heatRgba(t, 0.72));
    gradient.addColorStop(0.35, heatRgba(t, 0.38));
    gradient.addColorStop(0.7, heatRgba(t, 0.12));
    gradient.addColorStop(1, heatRgba(t, 0));

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.globalCompositeOperation = "source-over";
}

function HeatLegend() {
  return (
    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
      <span className="font-medium text-slate-700">Intensity</span>
      <div className="flex items-center gap-2">
        <span>Quiet</span>
        <div
          className="h-2 w-28 rounded-full"
          style={{
            background:
              "linear-gradient(to right, rgb(20, 184, 166), rgb(245, 158, 11), rgb(244, 63, 94))",
          }}
          aria-hidden
        />
        <span>Hot</span>
      </div>
      <span className="text-slate-400">
        Navigate ×1 · I&apos;m here ×2 · QR scan ×3
      </span>
    </div>
  );
}

export function VenueHeatmapView({ heatmap }: Props) {
  const defaultFloorId = useMemo(() => {
    const hottest = [...heatmap.floors].sort(
      (a, b) => b.totalWeight - a.totalWeight,
    )[0];
    return hottest?.floorPlanId ?? heatmap.floors[0]?.floorPlanId ?? null;
  }, [heatmap.floors]);

  const [selectedFloorId, setSelectedFloorId] = useState<string | null>(
    defaultFloorId,
  );
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [layoutTick, setLayoutTick] = useState(0);

  const floor = useMemo(
    () => heatmap.floors.find((f) => f.floorPlanId === selectedFloorId) ?? null,
    [heatmap.floors, selectedFloorId],
  );

  const renderHeat = useCallback(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas || !floor) return;

    const rect = container.getBoundingClientRect();
    drawHeatOverlay(
      canvas,
      Math.round(rect.width),
      Math.round(rect.height),
      floor.points,
      floor.maxWeight,
    );
  }, [floor]);

  useEffect(() => {
    renderHeat();
  }, [renderHeat, layoutTick]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || typeof ResizeObserver === "undefined") return;

    const observer = new ResizeObserver(() => {
      setLayoutTick((n) => n + 1);
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, [floor?.floorPlanId]);

  if (!heatmap.hasFloorPlans) {
    return (
      <Card className="space-y-2">
        <h3 className="text-sm font-semibold text-slate-900">Movement heatmap</h3>
        <p className="text-sm text-slate-600">
          Upload a floor plan on the Floors tab to see where attendees navigate,
          mark presence, and scan QRs.
        </p>
      </Card>
    );
  }

  return (
    <Card className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-slate-900">Movement heatmap</h3>
        <p className="mt-0.5 text-xs text-slate-500">
          POI-weighted glow on the floor plan — not continuous GPS tracking.
          Hotspots show where navigation, I&apos;m here, and QR scans cluster at
          placed locations.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {heatmap.floors.map((f) => (
          <button
            key={f.floorPlanId}
            type="button"
            onClick={() => setSelectedFloorId(f.floorPlanId)}
            className={cn(
              "rounded-full px-4 py-2 text-sm font-medium transition-colors",
              f.floorPlanId === selectedFloorId
                ? "bg-indigo-600 font-semibold text-white"
                : "bg-white text-slate-700 shadow-sm hover:bg-slate-50",
            )}
          >
            {f.floorName}
            {f.totalWeight > 0 ? (
              <span className="ml-1.5 opacity-80">· {f.totalWeight}</span>
            ) : null}
          </button>
        ))}
      </div>

      {!floor ? null : floor.points.length === 0 ? (
        <p className="text-sm text-slate-500">
          No movement data on {floor.floorName} yet. Activity appears when
          attendees navigate to places, tap I&apos;m here, or scan linked QRs.
        </p>
      ) : (
        <>
          <div
            ref={containerRef}
            className="relative overflow-hidden rounded-xl bg-slate-100 shadow-sm"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={floor.imageUrl}
              alt={`Floor plan for ${floor.floorName}`}
              className="block w-full select-none"
              draggable={false}
              onLoad={() => setLayoutTick((n) => n + 1)}
            />
            <canvas
              ref={canvasRef}
              role="img"
              aria-label={`Movement heat overlay for ${floor.floorName}`}
              className="pointer-events-none absolute inset-0 h-full w-full"
            />
          </div>
          <HeatLegend />
          <p className="text-xs text-slate-500">
            {floor.points.length} active location
            {floor.points.length === 1 ? "" : "s"} on this floor ·{" "}
            {floor.totalWeight.toLocaleString()} weighted interactions
          </p>
        </>
      )}
    </Card>
  );
}
