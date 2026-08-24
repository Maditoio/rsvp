"use client";

import { useMemo, useTransition } from "react";
import { Download } from "lucide-react";
import { exportAnalyticsSliceCsv } from "@/modules/meetings/operations-actions";
import type {
  CategoryMixRow,
  FunnelStage,
  GapAttendee,
  MatchmakingRoi,
  MeetingOutcomeTrend,
  RoomTimelineHour,
} from "@/modules/events/analytics-advanced";
import {
  DataTable,
  type DataTableColumn,
} from "@/components/data-table/data-table";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function FunnelBar({
  label,
  value,
  max,
}: {
  label: string;
  value: number;
  max: number;
}) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div>
      <div className="mb-1 flex justify-between text-sm">
        <span className="text-slate-700">{label}</span>
        <span className="tabular-nums text-slate-500">
          {value.toLocaleString()} ({pct}%)
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-indigo-600 transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function ExportButton({
  orgSlug,
  eventId,
  slice,
  filters,
}: {
  orgSlug: string;
  eventId: string;
  slice: string;
  filters: { categoryId: string; country: string; company: string };
}) {
  const [pending, start] = useTransition();

  return (
    <Button
      type="button"
      variant="secondary"
      size="sm"
      disabled={pending}
      onClick={() => {
        start(async () => {
          const fd = new FormData();
          fd.set("slice", slice);
          fd.set("categoryId", filters.categoryId);
          fd.set("country", filters.country);
          fd.set("company", filters.company);
          const csv = await exportAnalyticsSliceCsv(orgSlug, eventId, fd);
          const blob = new Blob([csv], { type: "text/csv" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `analytics-${slice}.csv`;
          a.click();
          URL.revokeObjectURL(url);
        });
      }}
    >
      <Download className="size-3.5" strokeWidth={1.75} />
      {pending ? "Exporting…" : "Export CSV"}
    </Button>
  );
}

export function AnalyticsAdvancedSections({
  orgSlug,
  eventId,
  section,
  canExport,
  filters,
  funnel,
  roi,
  roomTimeline,
  categoryMix,
  gaps,
  outcomes,
}: {
  orgSlug: string;
  eventId: string;
  section: string;
  canExport: boolean;
  filters: { categoryId: string; country: string; company: string };
  funnel: FunnelStage[];
  roi: MatchmakingRoi;
  roomTimeline: RoomTimelineHour[];
  categoryMix: CategoryMixRow[];
  gaps: GapAttendee[];
  outcomes: MeetingOutcomeTrend[];
}) {
  const header = (title: string, description: string, slice: string) => (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 className="font-display text-xl text-slate-900">{title}</h2>
        <p className="mt-1 text-sm text-slate-500">{description}</p>
      </div>
      {canExport ? (
        <ExportButton orgSlug={orgSlug} eventId={eventId} slice={slice} filters={filters} />
      ) : null}
    </div>
  );

  const categoryColumns = useMemo<DataTableColumn<CategoryMixRow>[]>(
    () => [
      {
        id: "category",
        header: "Category",
        width: "2fr",
        cell: (row) => (
          <span className="font-medium text-slate-700">{row.categoryName}</span>
        ),
      },
      {
        id: "meetings",
        header: "Meetings",
        width: "1fr",
        cell: (row) => (
          <span className="tabular-nums">{row.meetingCount}</span>
        ),
      },
      {
        id: "attendees",
        header: "Attendees",
        width: "1fr",
        cell: (row) => (
          <span className="tabular-nums">{row.attendeeCount}</span>
        ),
      },
    ],
    [],
  );

  const outcomeColumns = useMemo<DataTableColumn<MeetingOutcomeTrend>[]>(
    () => [
      {
        id: "period",
        header: "Period",
        width: "1.2fr",
        cell: (row) => (
          <span className="font-medium text-slate-700">{row.period}</span>
        ),
      },
      {
        id: "accepted",
        header: "Accepted",
        width: "1fr",
        cell: (row) => <span className="tabular-nums">{row.accepted}</span>,
      },
      {
        id: "declined",
        header: "Declined",
        width: "1fr",
        cell: (row) => <span className="tabular-nums">{row.declined}</span>,
      },
      {
        id: "cancelled",
        header: "Cancelled",
        width: "1fr",
        cell: (row) => <span className="tabular-nums">{row.cancelled}</span>,
      },
      {
        id: "noShow",
        header: "No-show",
        width: "1fr",
        cell: (row) => <span className="tabular-nums">{row.noShow}</span>,
      },
      {
        id: "completed",
        header: "Completed",
        width: "1fr",
        cell: (row) => <span className="tabular-nums">{row.completed}</span>,
      },
    ],
    [],
  );

  const gapColumns = useMemo<DataTableColumn<GapAttendee>[]>(
    () => [
      {
        id: "name",
        header: "Name",
        width: "1.4fr",
        cell: (row) => (
          <span className="font-medium text-slate-700">{row.name}</span>
        ),
      },
      {
        id: "company",
        header: "Company",
        width: "1.2fr",
        cell: (row) => row.company ?? "—",
      },
      {
        id: "category",
        header: "Category",
        width: "1fr",
        cell: (row) => row.category ?? "—",
      },
    ],
    [],
  );

  if (section === "overview") return null;

  if (section === "categories") {
    return (
      <div className="space-y-4">
        {header(
          "Category mix report",
          "Which categories meet most and least.",
          "category_mix",
        )}
        <DataTable
          rows={categoryMix}
          columns={categoryColumns}
          getRowId={(row) => row.categoryId ?? "none"}
          searchPlaceholder="Search categories…"
          searchFilter={(row, query) =>
            [
              row.categoryName,
              String(row.meetingCount),
              String(row.attendeeCount),
            ]
              .join(" ")
              .toLowerCase()
              .includes(query)
          }
          emptyMessage="No category mix data yet."
          showRowsPerPage
        />
      </div>
    );
  }

  if (section === "outcomes") {
    return (
      <div className="space-y-4">
        {header(
          "Meeting outcomes trends",
          "Accepted, declined, cancelled, no-show, and completed by month.",
          "outcomes",
        )}
        <DataTable
          rows={outcomes}
          columns={outcomeColumns}
          getRowId={(row) => row.period}
          searchPlaceholder="Search periods…"
          searchFilter={(row, query) =>
            [
              row.period,
              String(row.accepted),
              String(row.declined),
              String(row.cancelled),
              String(row.noShow),
              String(row.completed),
            ]
              .join(" ")
              .toLowerCase()
              .includes(query)
          }
          emptyMessage="No outcome trends yet."
          showRowsPerPage
        />
      </div>
    );
  }

  if (section === "gaps") {
    return (
      <div className="space-y-4">
        {header(
          "Gap finder",
          "Completed profiles with zero meetings or requests.",
          "gap_finder",
        )}
        <DataTable
          rows={gaps}
          columns={gapColumns}
          getRowId={(row) => row.id}
          searchPlaceholder="Search attendees…"
          searchFilter={(row, query) =>
            [row.name, row.company, row.category]
              .filter(Boolean)
              .join(" ")
              .toLowerCase()
              .includes(query)
          }
          emptyMessage="No gaps found."
          showRowsPerPage
        />
      </div>
    );
  }

  return (
    <section className="rounded-xl bg-white p-5 shadow-sm">
      {section === "funnel" ? (
        <>
          {header(
            "Funnel drill-down",
            "Invited through checked in — full lifecycle conversion.",
            "funnel",
          )}
          <div className="mt-4 space-y-3">
            {funnel.map((stage) => (
              <FunnelBar
                key={stage.stage}
                label={stage.stage}
                value={stage.count}
                max={funnel[0]?.count ?? 1}
              />
            ))}
          </div>
        </>
      ) : null}

      {section === "roi" ? (
        <>
          {header(
            "Matchmaking ROI",
            "Profile → request → scheduled → completed conversion.",
            "roi",
          )}
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[
              ["Profiles completed", roi.profilesCompleted],
              ["Meeting requests", roi.meetingRequests],
              ["Requests accepted", roi.requestsAccepted],
              ["Scheduled", roi.scheduled],
              ["Completed", roi.completed],
              [
                "Profile → request",
                roi.profileToRequestPct != null ? `${roi.profileToRequestPct}%` : "—",
              ],
              [
                "Request → scheduled",
                roi.requestToScheduledPct != null ? `${roi.requestToScheduledPct}%` : "—",
              ],
              [
                "Scheduled → completed",
                roi.scheduledToCompletedPct != null
                  ? `${roi.scheduledToCompletedPct}%`
                  : "—",
              ],
            ].map(([label, value]) => (
              <div
                key={String(label)}
                className="rounded-lg border border-slate-100 px-3.5 py-3"
              >
                <p className="text-xl font-semibold tabular-nums text-slate-900">{value}</p>
                <p className="mt-1 text-xs text-slate-500">{label}</p>
              </div>
            ))}
          </div>
        </>
      ) : null}

      {section === "rooms" ? (
        <>
          {header(
            "Room utilization timeline",
            "Meetings per hour vs total rooms.",
            "room_timeline",
          )}
          <div className="mt-4 space-y-2">
            {roomTimeline.map((row) => (
              <div key={row.hour} className="flex items-center gap-3 text-sm">
                <span className="w-14 tabular-nums text-slate-500">{row.label}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={cn(
                      "h-full rounded-full",
                      (row.utilizationPct ?? 0) >= 100
                        ? "bg-danger"
                        : "bg-indigo-600",
                    )}
                    style={{
                      width: `${Math.min(row.utilizationPct ?? 0, 100)}%`,
                    }}
                  />
                </div>
                <span className="w-24 text-right tabular-nums text-slate-600">
                  {row.usedRooms}/{row.totalRooms}
                  {row.utilizationPct != null ? ` (${row.utilizationPct}%)` : ""}
                </span>
              </div>
            ))}
          </div>
        </>
      ) : null}
    </section>
  );
}
