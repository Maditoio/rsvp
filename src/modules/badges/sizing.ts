/** Numeric size controls for badge elements (0–500). Units are CSS px. */

export const BADGE_SIZE_MIN = 0;
export const BADGE_SIZE_MAX = 500;

export const BADGE_SIZE_DEFAULTS = {
  nameSize: 18,
  companySize: 14,
  jobTitleSize: 12,
  categorySize: 10,
  countrySize: 12,
  eventNameSize: 8,
  eventLogoSize: 32,
  sponsorLogoSize: 20,
  qrPx: 56,
  contentGap: 8,
  padding: 12,
  borderRadius: 12,
  letterSpacing: 0,
} as const;

export type BadgeSizeKey = keyof typeof BADGE_SIZE_DEFAULTS;

/** Legacy discrete levels → multipliers (for migrating saved configs). */
const LEGACY_MULTIPLIERS: Record<string, number> = {
  xs: 0.75,
  sm: 0.875,
  md: 1,
  lg: 1.125,
  xl: 1.25,
  "2xl": 1.5,
};

const QR_LEGACY_BASE: Record<string, number> = {
  sm: 40,
  md: 56,
  lg: 64,
};

export function clampBadgeSize(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(BADGE_SIZE_MAX, Math.max(BADGE_SIZE_MIN, Math.round(value)));
}

export function parseBadgeSize(
  value: unknown,
  fallback: number,
  legacyBase?: number,
): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return clampBadgeSize(value);
  }
  if (typeof value === "string" && value.trim() !== "") {
    const asNumber = Number(value);
    if (Number.isFinite(asNumber)) return clampBadgeSize(asNumber);
    const mult = LEGACY_MULTIPLIERS[value];
    if (mult != null && legacyBase != null) {
      return clampBadgeSize(legacyBase * mult);
    }
  }
  return clampBadgeSize(fallback);
}

/** Convert legacy qrSize + qrScale into a single pixel size. */
export function migrateQrPx(raw: {
  qrPx?: unknown;
  qrSize?: unknown;
  qrScale?: unknown;
}): number {
  if (raw.qrPx != null) {
    return parseBadgeSize(raw.qrPx, BADGE_SIZE_DEFAULTS.qrPx);
  }
  const base =
    typeof raw.qrSize === "string" && raw.qrSize in QR_LEGACY_BASE
      ? QR_LEGACY_BASE[raw.qrSize]!
      : BADGE_SIZE_DEFAULTS.qrPx;
  const mult =
    typeof raw.qrScale === "string" && raw.qrScale in LEGACY_MULTIPLIERS
      ? LEGACY_MULTIPLIERS[raw.qrScale]!
      : 1;
  return clampBadgeSize(base * mult);
}

export function qrPresetToPx(qrSize: "sm" | "md" | "lg"): number {
  return QR_LEGACY_BASE[qrSize] ?? BADGE_SIZE_DEFAULTS.qrPx;
}

export const TEXT_ALIGNMENTS = ["left", "center", "right"] as const;
export type BadgeTextAlign = (typeof TEXT_ALIGNMENTS)[number];

export const NAME_WEIGHTS = [400, 500, 600, 700] as const;
export type BadgeNameWeight = (typeof NAME_WEIGHTS)[number];

export const CATEGORY_STYLES = ["pill", "plain"] as const;
export type BadgeCategoryStyle = (typeof CATEGORY_STYLES)[number];

export function parseTextAlign(
  value: unknown,
  fallback: BadgeTextAlign = "center",
): BadgeTextAlign {
  if (
    typeof value === "string" &&
    TEXT_ALIGNMENTS.includes(value as BadgeTextAlign)
  ) {
    return value as BadgeTextAlign;
  }
  return fallback;
}

export function parseNameWeight(
  value: unknown,
  fallback: BadgeNameWeight = 700,
): BadgeNameWeight {
  const n = typeof value === "string" ? Number(value) : value;
  if (n === 400 || n === 500 || n === 600 || n === 700) return n;
  return fallback;
}

export function parseCategoryStyle(
  value: unknown,
  fallback: BadgeCategoryStyle = "pill",
): BadgeCategoryStyle {
  if (
    typeof value === "string" &&
    CATEGORY_STYLES.includes(value as BadgeCategoryStyle)
  ) {
    return value as BadgeCategoryStyle;
  }
  return fallback;
}

export type EventLogoContext = "top" | "bottom" | "side";

const EVENT_LOGO_WIDTH_RATIO: Record<EventLogoContext, number> = {
  top: 3.5,
  bottom: 4,
  side: 2.8,
};

export function badgeEventLogoStyle(
  context: EventLogoContext,
  sizePx: number,
): { maxHeight: string; maxWidth: string } {
  const h = clampBadgeSize(sizePx);
  const w = clampBadgeSize(h * EVENT_LOGO_WIDTH_RATIO[context]);
  return {
    maxHeight: `${h}px`,
    maxWidth: `${w}px`,
  };
}

export function badgeSponsorLogoStyle(sizePx: number): {
  maxHeight: string;
  maxWidth: string;
} {
  const h = clampBadgeSize(sizePx);
  return {
    maxHeight: `${h}px`,
    maxWidth: `${clampBadgeSize(h * 3.6)}px`,
  };
}

export function badgeQrStyle(sizePx: number): {
  width: number;
  height: number;
} {
  const px = clampBadgeSize(sizePx);
  return { width: px, height: px };
}
