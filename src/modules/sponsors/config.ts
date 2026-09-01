import { z } from "zod";
import type { EventSponsorTier } from "@prisma/client";

export const EVENT_SPONSOR_TIERS = [
  "PLATINUM",
  "GOLD",
  "SILVER",
  "BRONZE",
  "STRATEGIC_PARTNER",
] as const satisfies readonly EventSponsorTier[];

export type EventSponsorTierId = (typeof EVENT_SPONSOR_TIERS)[number];

export const EVENT_SPONSOR_TIER_LABELS: Record<EventSponsorTierId, string> = {
  PLATINUM: "Platinum",
  GOLD: "Gold",
  SILVER: "Silver",
  BRONZE: "Bronze",
  STRATEGIC_PARTNER: "Strategic partner",
};

export type EventSponsorRecord = {
  id: string;
  name: string;
  websiteUrl: string | null;
  tier: EventSponsorTierId;
  logoUrl: string | null;
  sortOrder: number;
};

export type EventSponsorTierGroup = {
  tier: EventSponsorTierId;
  label: string;
  sponsors: EventSponsorRecord[];
};

const tierSchema = z.enum(EVENT_SPONSOR_TIERS);

/** Human-readable label from an uploaded logo filename (stem only). */
export function deriveSponsorNameFromFilename(filename: string): string {
  const base = filename.replace(/\.[^.]+$/, "").trim();
  if (!base) return "Partner";

  const humanized = base
    .replace(/[_-]+/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim();

  if (!humanized) return "Partner";

  return humanized
    .split(" ")
    .map((word) =>
      word.length <= 3 && word === word.toUpperCase()
        ? word
        : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase(),
    )
    .join(" ")
    .slice(0, 80);
}

/** Alt text for logos — always returns a non-empty string. */
export function sponsorAltText(sponsor: Pick<EventSponsorRecord, "name">): string {
  const trimmed = sponsor.name.trim();
  return trimmed || "Partner";
}

export const createSponsorSchema = z.object({
  name: z
    .string()
    .trim()
    .max(80)
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : undefined)),
  tier: tierSchema.default("GOLD"),
  websiteUrl: z
    .string()
    .trim()
    .max(2000)
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : null)),
});

export const updateSponsorSchema = createSponsorSchema.extend({
  id: z.string().min(1),
});

export function parseSponsorTier(value: unknown): EventSponsorTierId {
  const parsed = tierSchema.safeParse(value);
  return parsed.success ? parsed.data : "GOLD";
}

export function groupSponsorsByTier(
  sponsors: EventSponsorRecord[],
  options?: { tiers?: EventSponsorTierId[] },
): EventSponsorTierGroup[] {
  const tierOrder = options?.tiers ?? [...EVENT_SPONSOR_TIERS];
  const grouped = new Map<EventSponsorTierId, EventSponsorRecord[]>();

  for (const tier of tierOrder) {
    grouped.set(tier, []);
  }

  for (const sponsor of sponsors) {
    const list = grouped.get(sponsor.tier);
    if (list) list.push(sponsor);
  }

  for (const list of grouped.values()) {
    list.sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
  }

  return tierOrder.map((tier) => ({
    tier,
    label: EVENT_SPONSOR_TIER_LABELS[tier],
    sponsors: grouped.get(tier) ?? [],
  }));
}

/** Map DB sponsor to badge logo shape ({ id, name, url }). */
export function sponsorToBadgeLogo(sponsor: EventSponsorRecord): {
  id: string;
  name: string;
  url: string;
} | null {
  if (!sponsor.logoUrl) return null;
  return {
    id: sponsor.id,
    name: sponsorAltText(sponsor),
    url: sponsor.logoUrl,
  };
}

export function sponsorsToBadgeLogos(
  sponsors: EventSponsorRecord[],
): { id: string; name: string; url: string }[] {
  return sponsors
    .map(sponsorToBadgeLogo)
    .filter((s): s is { id: string; name: string; url: string } => Boolean(s));
}

export function defaultSponsorSectionTiers(): EventSponsorTierId[] {
  return ["PLATINUM", "GOLD", "SILVER", "BRONZE"];
}

export function parseSponsorSectionTiers(value: unknown): EventSponsorTierId[] {
  if (!Array.isArray(value)) return defaultSponsorSectionTiers();
  const allowed = new Set<string>(EVENT_SPONSOR_TIERS);
  const tiers = value.filter(
    (t): t is EventSponsorTierId =>
      typeof t === "string" && allowed.has(t),
  );
  return tiers.length > 0 ? tiers : defaultSponsorSectionTiers();
}

export const SPONSOR_LOGO_SIZES = ["sm", "md", "lg", "xl"] as const;
export type SponsorLogoSize = (typeof SPONSOR_LOGO_SIZES)[number];

export const SPONSOR_LOGO_SIZE_LABELS: Record<SponsorLogoSize, string> = {
  sm: "Small",
  md: "Medium",
  lg: "Large",
  xl: "Extra large",
};

export const SPONSOR_LOGO_SIZE_PRESETS: Record<
  SponsorLogoSize,
  { heightPx: number; maxWidthPx: number; cardHeightPx: number; cardWidthPx: number }
> = {
  sm: { heightPx: 32, maxWidthPx: 120, cardHeightPx: 80, cardWidthPx: 128 },
  md: { heightPx: 48, maxWidthPx: 160, cardHeightPx: 96, cardWidthPx: 160 },
  lg: { heightPx: 64, maxWidthPx: 220, cardHeightPx: 112, cardWidthPx: 208 },
  xl: { heightPx: 80, maxWidthPx: 280, cardHeightPx: 128, cardWidthPx: 256 },
};

export function parseSponsorLogoSize(value: unknown): SponsorLogoSize {
  if (
    typeof value === "string" &&
    SPONSOR_LOGO_SIZES.includes(value as SponsorLogoSize)
  ) {
    return value as SponsorLogoSize;
  }
  return "md";
}

/** Defaults to true so existing sites keep grayscale logos. */
export function parseSponsorLogoGrayscale(value: unknown): boolean {
  return value !== false;
}
