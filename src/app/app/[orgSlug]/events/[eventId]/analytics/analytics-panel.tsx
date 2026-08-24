"use client";

import { Suspense } from "react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { triggerMatchmakingBatch } from "@/modules/matchmaking/batch-actions";
import { EventAnalyticsDashboard } from "@/components/events/event-analytics-dashboard";
import type { EventAnalyticsSnapshot } from "@/modules/events/analytics";
import type {
  CategoryMixRow,
  FunnelStage,
  GapAttendee,
  MatchmakingRoi,
  MeetingOutcomeTrend,
  RoomTimelineHour,
} from "@/modules/events/analytics-advanced";
import { Button } from "@/components/ui/button";
import { AnalyticsFiltersBar } from "./analytics-filters";
import {
  AnalyticsSectionTabs,
  type AnalyticsSectionId,
} from "./analytics-section-tabs";
import { AnalyticsAdvancedSections } from "./analytics-advanced-sections";

export function AnalyticsPanel({
  orgSlug,
  eventId,
  analytics,
  canManage,
  canExport,
  aiInsightsEnabled,
  categories,
  filters,
  filtersActive,
  activeSection,
  advanced,
}: {
  orgSlug: string;
  eventId: string;
  analytics: EventAnalyticsSnapshot;
  canManage: boolean;
  canExport: boolean;
  aiInsightsEnabled: boolean;
  categories: { id: string; name: string }[];
  filters: { categoryId: string; country: string; company: string };
  filtersActive: boolean;
  activeSection: AnalyticsSectionId;
  advanced: {
    funnel: FunnelStage[];
    roi: MatchmakingRoi;
    roomTimeline: RoomTimelineHour[];
    categoryMix: CategoryMixRow[];
    gaps: GapAttendee[];
    outcomes: MeetingOutcomeTrend[];
  };
}) {
  const router = useRouter();
  const [batchResult, setBatchResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <div className="space-y-4">
      <Suspense fallback={<div className="h-16 rounded-xl bg-white shadow-sm" />}>
        <AnalyticsFiltersBar
          orgSlug={orgSlug}
          eventId={eventId}
          categories={categories}
          initial={filters}
        />
      </Suspense>

      <Suspense fallback={<div className="h-10" />}>
        <AnalyticsSectionTabs orgSlug={orgSlug} eventId={eventId} active={activeSection} />
      </Suspense>

      {canManage && aiInsightsEnabled ? (
        <div className="flex flex-wrap items-center gap-3 rounded-xl bg-white shadow-sm px-4 py-3">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-900">AI matchmaking pipeline</p>
            <p className="text-xs text-slate-500">
              Recompute structured scores and refresh AI rankings for eligible
              attendees.
            </p>
          </div>
          <Button
            type="button"
            variant="secondary"
            disabled={pending}
            onClick={() => {
              setError(null);
              setBatchResult(null);
              start(async () => {
                try {
                  const result = await triggerMatchmakingBatch(orgSlug, eventId);
                  setBatchResult(
                    `Recomputed ${result.scoresRecomputed} score pairs. AI ranked ${result.aiRanked}, insights ${result.aiInsights}.`,
                  );
                  router.refresh();
                } catch (e) {
                  setError(
                    e instanceof Error ? e.message : "Batch pipeline failed",
                  );
                }
              });
            }}
          >
            {pending ? "Running…" : "Run batch pipeline"}
          </Button>
        </div>
      ) : null}

      {batchResult ? (
        <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-success">
          {batchResult}
        </p>
      ) : null}
      {error ? <p className="text-sm text-danger">{error}</p> : null}

      {activeSection === "overview" ? (
        <EventAnalyticsDashboard
          analytics={analytics}
          orgSlug={orgSlug}
          eventId={eventId}
          filtersActive={filtersActive}
        />
      ) : (
        <Suspense fallback={<div className="h-40 rounded-xl bg-white shadow-sm" />}>
          <AnalyticsAdvancedSections
            orgSlug={orgSlug}
            eventId={eventId}
            section={activeSection}
            canExport={canExport}
            filters={filters}
            funnel={advanced.funnel}
            roi={advanced.roi}
            roomTimeline={advanced.roomTimeline}
            categoryMix={advanced.categoryMix}
            gaps={advanced.gaps}
            outcomes={advanced.outcomes}
          />
        </Suspense>
      )}
    </div>
  );
}
