import { Suspense } from "react";
import { prisma } from "@/lib/db/prisma";
import { requireEvent } from "@/lib/authz/require";
import { safe } from "@/lib/authz/safe";
import { hasPermission } from "@/lib/authz/permissions";
import { loadEventAnalytics, type EventAnalyticsFilters } from "@/modules/events/analytics";
import {
  loadFunnelDrillDown,
  loadRoomUtilizationTimeline,
  loadMeetingOutcomeTrends,
  loadMatchmakingRoi,
  loadCategoryMixReport,
  loadGapFinderAttendees,
} from "@/modules/events/analytics-advanced";
import { AnalyticsPanel } from "./analytics-panel";
import type { AnalyticsSectionId } from "./analytics-section-tabs";

const VALID_SECTIONS = new Set<AnalyticsSectionId>([
  "overview",
  "funnel",
  "roi",
  "rooms",
  "categories",
  "gaps",
  "outcomes",
]);

export default async function EventAnalyticsPage({
  params,
  searchParams,
}: PageProps<"/app/[orgSlug]/events/[eventId]/analytics">) {
  const { orgSlug, eventId } = await params;
  const query = await searchParams;
  const sectionParam =
    typeof query.section === "string" ? query.section : "overview";
  const activeSection: AnalyticsSectionId = VALID_SECTIONS.has(
    sectionParam as AnalyticsSectionId,
  )
    ? (sectionParam as AnalyticsSectionId)
    : "overview";

  const ctx = await safe(() => requireEvent(orgSlug, eventId, "event.read"));

  const filters: EventAnalyticsFilters = {
    categoryId:
      typeof query.categoryId === "string" && query.categoryId.trim()
        ? query.categoryId.trim()
        : null,
    country:
      typeof query.country === "string" && query.country.trim()
        ? query.country.trim()
        : null,
    company:
      typeof query.company === "string" && query.company.trim()
        ? query.company.trim()
        : null,
  };

  const [
    analytics,
    settings,
    categories,
    funnel,
    roi,
    roomTimeline,
    categoryMix,
    gaps,
    outcomes,
  ] = await Promise.all([
    loadEventAnalytics(ctx.organisation.id, eventId, filters),
    prisma.eventSettings.findUnique({
      where: { eventId },
      select: { aiInsightsEnabled: true },
    }),
    prisma.invitationCategory.findMany({
      where: { eventId, organisationId: ctx.organisation.id },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    loadFunnelDrillDown(ctx.organisation.id, eventId, filters),
    loadMatchmakingRoi(ctx.organisation.id, eventId, filters),
    loadRoomUtilizationTimeline(ctx.organisation.id, eventId),
    loadCategoryMixReport(ctx.organisation.id, eventId),
    loadGapFinderAttendees(ctx.organisation.id, eventId),
    loadMeetingOutcomeTrends(ctx.organisation.id, eventId),
  ]);

  return (
    <AnalyticsPanel
      orgSlug={orgSlug}
      eventId={eventId}
      analytics={analytics}
      canManage={hasPermission(ctx.grants, "event.update")}
      canExport={hasPermission(ctx.grants, "reports.export")}
      aiInsightsEnabled={settings?.aiInsightsEnabled === true}
      categories={categories}
      filters={{
        categoryId: filters.categoryId ?? "",
        country: filters.country ?? "",
        company: filters.company ?? "",
      }}
      filtersActive={Boolean(filters.categoryId || filters.country || filters.company)}
      activeSection={activeSection}
      advanced={{
        funnel,
        roi,
        roomTimeline,
        categoryMix,
        gaps,
        outcomes,
      }}
    />
  );
}
