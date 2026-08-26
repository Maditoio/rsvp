import { Card } from "@/components/ui/card";
import { VenueHeatmapView } from "@/components/venue/venue-heatmap-view";
import type { VenueMapInsights } from "@/modules/venue/insights";
import { cn } from "@/lib/utils";

function StatPill({
  label,
  value,
  hint,
}: {
  label: string;
  value: number;
  hint?: string;
}) {
  return (
    <div className="rounded-xl bg-white p-4 shadow-sm">
      <p className="text-[0.71875rem] font-semibold uppercase tracking-[0.04em] text-slate-400">
        {label}
      </p>
      <p className="mt-1 text-2xl font-semibold tracking-[-0.02em] text-slate-900">
        {value.toLocaleString()}
      </p>
      {hint ? <p className="mt-0.5 text-xs text-slate-500">{hint}</p> : null}
    </div>
  );
}

function RankList({
  title,
  empty,
  rows,
}: {
  title: string;
  empty: string;
  rows: { key: string; label: string; count: number }[];
}) {
  const max = rows[0]?.count ?? 0;
  return (
    <Card className="space-y-3">
      <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      {rows.length === 0 ? (
        <p className="text-sm text-slate-500">{empty}</p>
      ) : (
        <ul className="space-y-2.5">
          {rows.map((row, i) => (
            <li key={row.key}>
              <div className="flex items-baseline justify-between gap-2 text-sm">
                <span className="min-w-0 truncate text-slate-700">
                  <span className="mr-1.5 text-slate-400">{i + 1}.</span>
                  {row.label}
                </span>
                <span className="shrink-0 font-semibold text-slate-900">
                  {row.count.toLocaleString()}
                </span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-indigo-600"
                  style={{
                    width: max > 0 ? `${Math.max(6, (row.count / max) * 100)}%` : "0%",
                  }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function HeatBadge({ total, max }: { total: number; max: number }) {
  if (max <= 0 || total <= 0) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
        <span className="size-1.5 rounded-full bg-slate-400" aria-hidden />
        Cold
      </span>
    );
  }
  const ratio = total / max;
  if (ratio >= 0.66) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-2.5 py-1 text-xs font-medium text-rose-800">
        <span className="size-1.5 rounded-full bg-rose-500" aria-hidden />
        Hot
      </span>
    );
  }
  if (ratio >= 0.33) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-900">
        <span className="size-1.5 rounded-full bg-amber-500" aria-hidden />
        Warm
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-50 px-2.5 py-1 text-xs font-medium text-teal-800">
      <span className="size-1.5 rounded-full bg-teal-500" aria-hidden />
      Quiet
    </span>
  );
}

export function VenueInsightsPanel({ insights }: { insights: VenueMapInsights }) {
  const maxFloor = insights.floorZones[0]?.total ?? 0;
  const peakHour = [...insights.hourlyPeaks].sort((a, b) => b.count - a.count)[0];
  const maxHour = peakHour?.count ?? 0;

  if (!insights.hasAnyData) {
    return (
      <div className="space-y-6">
        <VenueHeatmapView heatmap={insights.heatmap} />
        <Card className="space-y-2">
          <h2 className="text-lg font-semibold text-slate-900">Map insights</h2>
          <p className="text-sm text-slate-600">
            No map activity yet. Insights appear when attendees search the map, tap
            Go / View map, mark I&apos;m here, or scan a floor QR.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Map activity</h2>
        <p className="mt-1 text-sm text-slate-600">
          Aggregated from attendee search, navigation, presence, and checkpoint
          scans. Counts are anonymous — no live attendee tracking.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatPill
          label="Searches"
          value={insights.totals.searches}
          hint={`Today ${insights.todayTotals.searches.toLocaleString()}`}
        />
        <StatPill
          label="Navigations"
          value={insights.totals.navigations}
          hint={`Today ${insights.todayTotals.navigations.toLocaleString()}`}
        />
        <StatPill
          label="I'm here"
          value={insights.totals.here}
          hint={`Today ${insights.todayTotals.here.toLocaleString()}`}
        />
        <StatPill
          label="QR scans"
          value={insights.totals.scans}
          hint={`Today ${insights.todayTotals.scans.toLocaleString()}`}
        />
      </div>

      <VenueHeatmapView heatmap={insights.heatmap} />

      <div className="grid gap-4 lg:grid-cols-2">
        <RankList
          title="Top searched queries"
          empty="No searches recorded yet."
          rows={insights.topQueries}
        />
        <RankList
          title="Top destinations"
          empty="No navigations recorded yet."
          rows={insights.topDestinations}
        />
        <RankList
          title="I'm here by place"
          empty="No presence marks yet."
          rows={insights.topHerePois}
        />
        <RankList
          title="QR scans by place"
          empty="No checkpoint scans linked to a place yet."
          rows={insights.topScanPois}
        />
      </div>

      <Card className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              Hot &amp; cold floors
            </h3>
            <p className="mt-0.5 text-xs text-slate-500">
              Combined search, navigate, I&apos;m here, and scan activity per floor.
            </p>
          </div>
        </div>
        {insights.floorZones.length === 0 ? (
          <p className="text-sm text-slate-500">No floor-linked activity yet.</p>
        ) : (
          <ul className="space-y-3">
            {insights.floorZones.map((z) => (
              <li
                key={z.floorPlanId}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2.5"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-900">
                    {z.floorName}
                  </p>
                  <p className="text-xs text-slate-500">
                    {z.searches} search · {z.navigations} go · {z.here} here ·{" "}
                    {z.scans} scan
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <HeatBadge total={z.total} max={maxFloor} />
                  <span className="text-sm font-semibold text-slate-900">
                    {z.total.toLocaleString()}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">
            Time-of-day peaks
          </h3>
          <p className="mt-0.5 text-xs text-slate-500">
            All map events by UTC hour
            {peakHour && peakHour.count > 0
              ? ` · busiest around ${peakHour.label}`
              : ""}
            .
          </p>
        </div>
        {insights.hourlyPeaks.every((h) => h.count === 0) ? (
          <p className="text-sm text-slate-500">Not enough data for a peak chart.</p>
        ) : (
          <div className="flex h-28 items-end gap-1">
            {Array.from({ length: 24 }, (_, hour) => {
              const row = insights.hourlyPeaks.find((h) => h.hour === hour);
              const count = row?.count ?? 0;
              const height =
                maxHour > 0 ? Math.max(count > 0 ? 8 : 2, (count / maxHour) * 100) : 2;
              return (
                <div
                  key={hour}
                  className="flex flex-1 flex-col items-center justify-end gap-1"
                  title={`${hourLabel(hour)}: ${count}`}
                >
                  <div
                    className={cn(
                      "w-full rounded-t-sm",
                      count > 0 ? "bg-indigo-600" : "bg-slate-100",
                    )}
                    style={{ height: `${height}%` }}
                  />
                </div>
              );
            })}
          </div>
        )}
        <div className="flex justify-between text-[0.625rem] text-slate-400">
          <span>12am</span>
          <span>6am</span>
          <span>12pm</span>
          <span>6pm</span>
          <span>11pm</span>
        </div>
      </Card>

      <div className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            Exhibitor &amp; meeting room insights
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Share these aggregate counts with exhibitors and hosts. Named
            attendees are never listed here.
          </p>
        </div>

        {insights.standInsights.length === 0 ? (
          <Card>
            <p className="text-sm text-slate-500">
              Add exhibitor stands or meeting rooms on the floor plan to see
              per-stand demand.
            </p>
          </Card>
        ) : (
          <ul className="grid gap-3 md:grid-cols-2">
            {insights.standInsights.map((stand) => (
              <li key={stand.poiId}>
                <Card className="space-y-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900">
                        {stand.name}
                      </p>
                      <p className="text-xs text-slate-500">
                        {stand.categoryLabel} · {stand.floorName}
                      </p>
                    </div>
                    <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700">
                      {stand.total.toLocaleString()} event
                    </span>
                  </div>
                  <dl className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
                    <div className="rounded-lg bg-slate-50 px-2.5 py-2">
                      <dt className="text-[0.625rem] font-semibold uppercase tracking-wide text-slate-400">
                        Searches
                      </dt>
                      <dd className="font-semibold text-slate-900">
                        {stand.searches}
                      </dd>
                    </div>
                    <div className="rounded-lg bg-slate-50 px-2.5 py-2">
                      <dt className="text-[0.625rem] font-semibold uppercase tracking-wide text-slate-400">
                        Navigations
                      </dt>
                      <dd className="font-semibold text-slate-900">
                        {stand.navigations}
                      </dd>
                    </div>
                    <div className="rounded-lg bg-slate-50 px-2.5 py-2">
                      <dt className="text-[0.625rem] font-semibold uppercase tracking-wide text-slate-400">
                        I&apos;m here
                      </dt>
                      <dd className="font-semibold text-slate-900">{stand.here}</dd>
                    </div>
                    <div className="rounded-lg bg-slate-50 px-2.5 py-2">
                      <dt className="text-[0.625rem] font-semibold uppercase tracking-wide text-slate-400">
                        QR scans
                      </dt>
                      <dd className="font-semibold text-slate-900">{stand.scans}</dd>
                    </div>
                  </dl>
                  <p className="text-xs text-slate-500">
                    Today: {stand.todayTotal.toLocaleString()} interactions
                  </p>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function hourLabel(hour: number): string {
  const h = ((hour % 24) + 24) % 24;
  const suffix = h < 12 ? "am" : "pm";
  const display = h % 12 === 0 ? 12 : h % 12;
  return `${display}${suffix}`;
}
