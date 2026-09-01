const FALLBACK_TIMEZONES = [
  "UTC",
  "Africa/Johannesburg",
  "Africa/Lagos",
  "Africa/Cairo",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Sao_Paulo",
  "Asia/Dubai",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Australia/Sydney",
] as const;

export function listIanaTimezones(): string[] {
  if (typeof Intl !== "undefined" && "supportedValuesOf" in Intl) {
    return Intl.supportedValuesOf("timeZone").slice().sort();
  }
  return [...FALLBACK_TIMEZONES];
}

export function isValidIanaTimezone(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  try {
    Intl.DateTimeFormat(undefined, { timeZone: trimmed });
    return true;
  } catch {
    return false;
  }
}

export function detectBrowserTimezone(): string {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return isValidIanaTimezone(tz) ? tz : "UTC";
  } catch {
    return "UTC";
  }
}

export function formatTimezoneLabel(timeZone: string, at: Date = new Date()): string {
  const label = timeZone.replace(/_/g, " ");
  try {
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone,
      timeZoneName: "shortOffset",
    }).formatToParts(at);
    const offset = parts.find((part) => part.type === "timeZoneName")?.value;
    return offset ? `${label} (${offset})` : label;
  } catch {
    return label;
  }
}

export type TimezoneOptionGroup = {
  region: string;
  zones: { value: string; label: string }[];
};

export function groupTimezoneOptions(
  zones: string[] = listIanaTimezones(),
  at: Date = new Date(),
): TimezoneOptionGroup[] {
  const groups = new Map<string, { value: string; label: string }[]>();

  for (const zone of zones) {
    const region = zone.includes("/") ? zone.split("/")[0]! : "Other";
    const items = groups.get(region) ?? [];
    items.push({ value: zone, label: formatTimezoneLabel(zone, at) });
    groups.set(region, items);
  }

  return [...groups.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([region, zoneOptions]) => ({
      region,
      zones: zoneOptions.sort((a, b) => a.label.localeCompare(b.label)),
    }));
}
