"use client";

import { cn } from "@/lib/utils";
import type { HeatmapCell } from "@/modules/meetings/heatmap";

export function SlotHeatmapTab({
  cells,
  maxDemand,
  roomCount,
}: {
  cells: HeatmapCell[];
  maxDemand: number;
  roomCount: number;
}) {
  if (cells.length === 0) {
    return (
      <p className="rounded-xl bg-white px-4 py-8 text-center text-sm text-slate-600 shadow-sm">
        Set event dates and add meeting rooms to view slot demand.
      </p>
    );
  }

  const days = [...new Set(cells.map((c) => c.dayKey))];
  const hours = [...new Set(cells.map((c) => c.hour))].sort((a, b) => a - b);
  const cellMap = new Map(cells.map((c) => [`${c.dayKey}:${c.hour}`, c]));

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-display text-xl text-slate-900">Slot heatmap</h2>
        <p className="mt-1 text-[0.8125rem] text-slate-500">
          Demand by day and hour from scheduling patterns. Red cells exceed room
          capacity ({roomCount} room{roomCount === 1 ? "" : "s"}).
        </p>
      </div>
      <div className="overflow-x-auto rounded-xl bg-white p-4 shadow-sm">
        <table className="min-w-full border-collapse text-xs">
          <thead>
            <tr>
              <th className="p-2 text-left font-medium text-slate-500">Day</th>
              {hours.map((h) => (
                <th key={h} className="p-2 text-center font-medium text-slate-500">
                  {String(h).padStart(2, "0")}:00
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {days.map((dayKey) => {
              const label = cells.find((c) => c.dayKey === dayKey)?.dayLabel ?? dayKey;
              return (
                <tr key={dayKey}>
                  <td className="whitespace-nowrap p-2 font-medium text-slate-700">{label}</td>
                  {hours.map((hour) => {
                    const cell = cellMap.get(`${dayKey}:${hour}`);
                    if (!cell) {
                      return <td key={hour} className="p-1" />;
                    }
                    const intensity =
                      maxDemand > 0 ? cell.demand / maxDemand : 0;
                    return (
                      <td key={hour} className="p-1">
                        <div
                          title={`Demand ${cell.demand}, scheduled ${cell.scheduled}`}
                          className={cn(
                            "flex h-8 min-w-8 items-center justify-center rounded-md text-[0.625rem] font-semibold tabular-nums",
                            cell.overloaded
                              ? "bg-danger-bg text-danger ring-1 ring-danger/30"
                              : intensity > 0.6
                                ? "bg-indigo-100 text-indigo-800"
                                : intensity > 0.3
                                  ? "bg-indigo-50 text-indigo-700"
                                  : "bg-slate-50 text-slate-500",
                          )}
                        >
                          {cell.scheduled > 0 ? cell.scheduled : "·"}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
