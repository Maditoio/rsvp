export const MAP_ANALYTICS_KINDS = [
  "map.search",
  "map.navigate",
  "map.here",
  "checkpoint.scan",
] as const;

export type MapAnalyticsKind = (typeof MAP_ANALYTICS_KINDS)[number];

export function isMapAnalyticsKind(value: string): value is MapAnalyticsKind {
  return (MAP_ANALYTICS_KINDS as readonly string[]).includes(value);
}

/** Max length stored for map search queries (no secrets; truncate aggressively). */
export const MAP_ANALYTICS_QUERY_MAX = 80;

export function sanitizeMapSearchQuery(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const cleaned = raw
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAP_ANALYTICS_QUERY_MAX);
  return cleaned.length > 0 ? cleaned : null;
}
