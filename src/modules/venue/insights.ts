import "server-only";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { mapPoiCategoryLabel } from "@/modules/venue/categories";

export type NamedCount = {
  key: string;
  label: string;
  count: number;
};

export type FloorZoneInsight = {
  floorPlanId: string;
  floorName: string;
  searches: number;
  navigations: number;
  here: number;
  scans: number;
  total: number;
};

export type HourlyPeak = {
  hour: number;
  label: string;
  count: number;
};

export type StandInsight = {
  poiId: string;
  name: string;
  category: string;
  categoryLabel: string;
  floorPlanId: string;
  floorName: string;
  searches: number;
  navigations: number;
  here: number;
  scans: number;
  total: number;
  todayTotal: number;
};

/** Weighted movement intensity at a POI (normalized 0–1 coords on floor image). */
export type HeatmapPoint = {
  poiId: string;
  name: string;
  category: string;
  x: number;
  y: number;
  navigations: number;
  here: number;
  scans: number;
  /** Combined weighted score: navigate×1 + here×2 + scan×3 */
  weight: number;
};

export type FloorHeatmap = {
  floorPlanId: string;
  floorName: string;
  floorIndex: number;
  imageUrl: string;
  points: HeatmapPoint[];
  maxWeight: number;
  totalWeight: number;
};

export type VenueHeatmapData = {
  floors: FloorHeatmap[];
  hasFloorPlans: boolean;
  /** True when at least one POI has movement weight > 0 */
  hasHeatData: boolean;
};

export type VenueMapInsights = {
  totals: {
    searches: number;
    navigations: number;
    here: number;
    scans: number;
    all: number;
  };
  todayTotals: {
    searches: number;
    navigations: number;
    here: number;
    scans: number;
    all: number;
  };
  topQueries: NamedCount[];
  topDestinations: NamedCount[];
  topHerePois: NamedCount[];
  topScanPois: NamedCount[];
  floorZones: FloorZoneInsight[];
  hourlyPeaks: HourlyPeak[];
  standInsights: StandInsight[];
  heatmap: VenueHeatmapData;
  hasAnyData: boolean;
};

const HEAT_NAV_WEIGHT = 1;
const HEAT_HERE_WEIGHT = 2;
const HEAT_SCAN_WEIGHT = 3;

function heatWeightFromCounts(counts: {
  navigations: number;
  here: number;
  scans: number;
}): number {
  return (
    counts.navigations * HEAT_NAV_WEIGHT +
    counts.here * HEAT_HERE_WEIGHT +
    counts.scans * HEAT_SCAN_WEIGHT
  );
}

function startOfUtcDay(d = new Date()): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function hourLabel(hour: number): string {
  const h = ((hour % 24) + 24) % 24;
  const suffix = h < 12 ? "am" : "pm";
  const display = h % 12 === 0 ? 12 : h % 12;
  return `${display}${suffix}`;
}

async function countByKind(
  organisationId: string,
  eventId: string,
  since?: Date,
): Promise<Record<string, number>> {
  const rows = await prisma.mapAnalyticsEvent.groupBy({
    by: ["kind"],
    where: {
      organisationId,
      eventId,
      ...(since ? { createdAt: { gte: since } } : {}),
    },
    _count: { _all: true },
  });
  const out: Record<string, number> = {};
  for (const row of rows) {
    out[row.kind] = row._count._all;
  }
  return out;
}

function totalsFromKindMap(map: Record<string, number>) {
  const searches = map["map.search"] ?? 0;
  const navigations = map["map.navigate"] ?? 0;
  const here = map["map.here"] ?? 0;
  const scans = map["checkpoint.scan"] ?? 0;
  return {
    searches,
    navigations,
    here,
    scans,
    all: searches + navigations + here + scans,
  };
}

async function loadVenueHeatmapData(
  organisationId: string,
  eventId: string,
): Promise<VenueHeatmapData> {
  const [floorPlans, poiKindRows, checkpointKindRows] = await Promise.all([
    prisma.venueFloorPlan.findMany({
      where: { organisationId, eventId },
      select: {
        id: true,
        name: true,
        floorIndex: true,
        imageUrl: true,
        pois: {
          select: {
            id: true,
            name: true,
            category: true,
            x: true,
            y: true,
          },
        },
      },
      orderBy: [{ floorIndex: "asc" }, { name: "asc" }],
    }),
    prisma.mapAnalyticsEvent.groupBy({
      by: ["poiId", "kind"],
      where: {
        organisationId,
        eventId,
        poiId: { not: null },
        kind: { in: ["map.navigate", "map.here", "checkpoint.scan"] },
      },
      _count: { _all: true },
    }),
    prisma.mapAnalyticsEvent.groupBy({
      by: ["checkpointId", "kind"],
      where: {
        organisationId,
        eventId,
        poiId: null,
        checkpointId: { not: null },
        kind: { in: ["map.navigate", "map.here", "checkpoint.scan"] },
      },
      _count: { _all: true },
    }),
  ]);

  if (floorPlans.length === 0) {
    return { floors: [], hasFloorPlans: false, hasHeatData: false };
  }

  const poiCounts = new Map<
    string,
    { navigations: number; here: number; scans: number }
  >();

  function addCount(
    poiId: string,
    kind: string,
    count: number,
  ): void {
    const acc = poiCounts.get(poiId) ?? {
      navigations: 0,
      here: 0,
      scans: 0,
    };
    if (kind === "map.navigate") acc.navigations += count;
    else if (kind === "map.here") acc.here += count;
    else if (kind === "checkpoint.scan") acc.scans += count;
    poiCounts.set(poiId, acc);
  }

  for (const row of poiKindRows) {
    if (!row.poiId) continue;
    addCount(row.poiId, row.kind, row._count._all);
  }

  const checkpointIds = [
    ...new Set(
      checkpointKindRows
        .map((r) => r.checkpointId)
        .filter((id): id is string => Boolean(id)),
    ),
  ];

  if (checkpointIds.length > 0) {
    const checkpoints = await prisma.mapCheckpoint.findMany({
      where: {
        organisationId,
        eventId,
        id: { in: checkpointIds },
        poiId: { not: null },
      },
      select: { id: true, poiId: true },
    });
    const checkpointPoi = new Map(
      checkpoints
        .filter((c) => c.poiId)
        .map((c) => [c.id, c.poiId!]),
    );
    for (const row of checkpointKindRows) {
      if (!row.checkpointId) continue;
      const poiId = checkpointPoi.get(row.checkpointId);
      if (!poiId) continue;
      addCount(poiId, row.kind, row._count._all);
    }
  }

  const floors: FloorHeatmap[] = floorPlans.map((floor) => {
    const points: HeatmapPoint[] = floor.pois
      .map((poi) => {
        const counts = poiCounts.get(poi.id) ?? {
          navigations: 0,
          here: 0,
          scans: 0,
        };
        const weight = heatWeightFromCounts(counts);
        return {
          poiId: poi.id,
          name: poi.name,
          category: poi.category,
          x: poi.x,
          y: poi.y,
          ...counts,
          weight,
        };
      })
      .filter((p) => p.weight > 0)
      .sort((a, b) => b.weight - a.weight);

    const maxWeight = points[0]?.weight ?? 0;
    const totalWeight = points.reduce((sum, p) => sum + p.weight, 0);

    return {
      floorPlanId: floor.id,
      floorName: floor.name,
      floorIndex: floor.floorIndex,
      imageUrl: floor.imageUrl,
      points,
      maxWeight,
      totalWeight,
    };
  });

  const hasHeatData = floors.some((f) => f.points.length > 0);

  return {
    floors,
    hasFloorPlans: true,
    hasHeatData,
  };
}

export async function loadVenueMapInsights(
  organisationId: string,
  eventId: string,
): Promise<VenueMapInsights> {
  const today = startOfUtcDay();

  const [
    kindTotals,
    todayKinds,
    queryGroups,
    navigateGroups,
    hereGroups,
    scanGroups,
    floorRows,
    hourlyRaw,
    standPois,
    heatmap,
  ] = await Promise.all([
    countByKind(organisationId, eventId),
    countByKind(organisationId, eventId, today),
    prisma.mapAnalyticsEvent.groupBy({
      by: ["query"],
      where: {
        organisationId,
        eventId,
        kind: "map.search",
        query: { not: null },
      },
      _count: { _all: true },
    }),
    prisma.mapAnalyticsEvent.groupBy({
      by: ["poiId"],
      where: {
        organisationId,
        eventId,
        kind: "map.navigate",
        poiId: { not: null },
      },
      _count: { _all: true },
    }),
    prisma.mapAnalyticsEvent.groupBy({
      by: ["poiId"],
      where: {
        organisationId,
        eventId,
        kind: "map.here",
        poiId: { not: null },
      },
      _count: { _all: true },
    }),
    prisma.mapAnalyticsEvent.groupBy({
      by: ["poiId"],
      where: {
        organisationId,
        eventId,
        kind: "checkpoint.scan",
        poiId: { not: null },
      },
      _count: { _all: true },
    }),
    prisma.mapAnalyticsEvent.groupBy({
      by: ["floorPlanId", "kind"],
      where: {
        organisationId,
        eventId,
        floorPlanId: { not: null },
      },
      _count: { _all: true },
    }),
    prisma.$queryRaw<Array<{ hour: number; count: bigint }>>`
      SELECT EXTRACT(HOUR FROM "createdAt")::int AS hour, COUNT(*)::bigint AS count
      FROM "MapAnalyticsEvent"
      WHERE "organisationId" = ${organisationId}
        AND "eventId" = ${eventId}
      GROUP BY 1
      ORDER BY 1
    `,
    prisma.mapPoi.findMany({
      where: {
        organisationId,
        eventId,
        category: { in: ["exhibitor_stand", "meeting_room"] },
      },
      select: {
        id: true,
        name: true,
        category: true,
        floorPlanId: true,
        floorPlan: { select: { name: true } },
      },
      orderBy: [{ name: "asc" }],
    }),
    loadVenueHeatmapData(organisationId, eventId),
  ]);

  const poiIds = new Set<string>();
  for (const g of [...navigateGroups, ...hereGroups, ...scanGroups]) {
    if (g.poiId) poiIds.add(g.poiId);
  }
  for (const p of standPois) poiIds.add(p.id);

  const pois = poiIds.size
    ? await prisma.mapPoi.findMany({
        where: { organisationId, eventId, id: { in: [...poiIds] } },
        select: { id: true, name: true, category: true },
      })
    : [];
  const poiName = new Map(pois.map((p) => [p.id, p.name]));

  const floorIds = [
    ...new Set(
      floorRows
        .map((r) => r.floorPlanId)
        .filter((id): id is string => Boolean(id)),
    ),
  ];
  const floors = floorIds.length
    ? await prisma.venueFloorPlan.findMany({
        where: { organisationId, eventId, id: { in: floorIds } },
        select: { id: true, name: true, floorIndex: true },
        orderBy: [{ floorIndex: "asc" }, { name: "asc" }],
      })
    : [];
  const floorName = new Map(floors.map((f) => [f.id, f.name]));

  const topQueries: NamedCount[] = queryGroups
    .filter((g) => g.query)
    .map((g) => ({
      key: g.query!,
      label: g.query!,
      count: g._count._all,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 12);

  const topDestinations: NamedCount[] = navigateGroups
    .filter((g) => g.poiId)
    .map((g) => ({
      key: g.poiId!,
      label: poiName.get(g.poiId!) ?? "Unknown place",
      count: g._count._all,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 12);

  const topHerePois: NamedCount[] = hereGroups
    .filter((g) => g.poiId)
    .map((g) => ({
      key: g.poiId!,
      label: poiName.get(g.poiId!) ?? "Unknown place",
      count: g._count._all,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 12);

  const topScanPois: NamedCount[] = scanGroups
    .filter((g) => g.poiId)
    .map((g) => ({
      key: g.poiId!,
      label: poiName.get(g.poiId!) ?? "Unknown place",
      count: g._count._all,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 12);

  const floorAcc = new Map<
    string,
    { searches: number; navigations: number; here: number; scans: number }
  >();
  for (const row of floorRows) {
    if (!row.floorPlanId) continue;
    const acc = floorAcc.get(row.floorPlanId) ?? {
      searches: 0,
      navigations: 0,
      here: 0,
      scans: 0,
    };
    const n = row._count._all;
    if (row.kind === "map.search") acc.searches += n;
    else if (row.kind === "map.navigate") acc.navigations += n;
    else if (row.kind === "map.here") acc.here += n;
    else if (row.kind === "checkpoint.scan") acc.scans += n;
    floorAcc.set(row.floorPlanId, acc);
  }

  const floorZones: FloorZoneInsight[] = [...floorAcc.entries()]
    .map(([floorPlanId, counts]) => {
      const total =
        counts.searches + counts.navigations + counts.here + counts.scans;
      return {
        floorPlanId,
        floorName: floorName.get(floorPlanId) ?? "Floor",
        ...counts,
        total,
      };
    })
    .sort((a, b) => b.total - a.total);

  const hourlyPeaks: HourlyPeak[] = hourlyRaw.map((r) => ({
    hour: r.hour,
    label: hourLabel(r.hour),
    count: Number(r.count),
  }));

  const standIds = standPois.map((p) => p.id);
  let standKindRows: Array<{
    poiId: string | null;
    kind: string;
    _count: { _all: number };
  }> = [];
  let standTodayRows: Array<{ poiId: string | null; _count: { _all: number } }> =
    [];

  if (standIds.length > 0) {
    [standKindRows, standTodayRows] = await Promise.all([
      prisma.mapAnalyticsEvent.groupBy({
        by: ["poiId", "kind"],
        where: {
          organisationId,
          eventId,
          poiId: { in: standIds },
        },
        _count: { _all: true },
      }),
      prisma.mapAnalyticsEvent.groupBy({
        by: ["poiId"],
        where: {
          organisationId,
          eventId,
          poiId: { in: standIds },
          createdAt: { gte: today },
        },
        _count: { _all: true },
      }),
    ]);
  }

  const standKindMap = new Map<string, Record<string, number>>();
  for (const row of standKindRows) {
    if (!row.poiId) continue;
    const m = standKindMap.get(row.poiId) ?? {};
    m[row.kind] = row._count._all;
    standKindMap.set(row.poiId, m);
  }
  const standTodayMap = new Map(
    standTodayRows
      .filter((r) => r.poiId)
      .map((r) => [r.poiId!, r._count._all]),
  );

  const standInsights: StandInsight[] = standPois
    .map((p) => {
      const m = standKindMap.get(p.id) ?? {};
      const searches = m["map.search"] ?? 0;
      const navigations = m["map.navigate"] ?? 0;
      const here = m["map.here"] ?? 0;
      const scans = m["checkpoint.scan"] ?? 0;
      const total = searches + navigations + here + scans;
      return {
        poiId: p.id,
        name: p.name,
        category: p.category,
        categoryLabel: mapPoiCategoryLabel(p.category),
        floorPlanId: p.floorPlanId,
        floorName: p.floorPlan.name,
        searches,
        navigations,
        here,
        scans,
        total,
        todayTotal: standTodayMap.get(p.id) ?? 0,
      };
    })
    .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name));

  const totals = totalsFromKindMap(kindTotals);
  const todayTotals = totalsFromKindMap(todayKinds);

  return {
    totals,
    todayTotals,
    topQueries,
    topDestinations,
    topHerePois,
    topScanPois,
    floorZones,
    hourlyPeaks,
    standInsights,
    heatmap,
    hasAnyData: totals.all > 0,
  };
}

/** Optional audit when organisers open map insights (lightweight metadata only). */
export async function auditMapInsightsView(input: {
  organisationId: string;
  eventId: string;
  userId: string;
}): Promise<void> {
  try {
    const { writeAudit } = await import("@/modules/audit/log");
    await writeAudit({
      organisationId: input.organisationId,
      eventId: input.eventId,
      userId: input.userId,
      action: "map.insights.view",
      resource: "MapAnalyticsEvent",
      metadata: { window: "event" } satisfies Prisma.InputJsonValue,
    });
  } catch {
    // Non-blocking
  }
}
