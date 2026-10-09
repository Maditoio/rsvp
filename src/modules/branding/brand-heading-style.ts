/** Shared heading style for public invite/register pages and invitation hero PNG. */

export type BrandHeadingFont =
  | "inter"
  | "dm-sans"
  | "source-serif"
  | "manrope"
  | "jakarta"
  | "space-grotesk"
  | "playfair"
  | "outfit"
  /** @deprecated aliases kept for saved settings */
  | "serif"
  | "modern";

/** Title size in pixels (hero compose reference). Legacy presets map into this. */
export type BrandHeadingSize = number;
export type BrandHeadingWeight = "regular" | "medium" | "semibold" | "bold";
export type BrandHeadingTracking = "tight" | "normal" | "wide";
export type BrandHeadingAlign = "left" | "center";
export type BrandHeadingLineHeight = "tight" | "normal" | "relaxed";

export type BrandHeadingStyle = {
  color: string | null;
  font: BrandHeadingFont;
  size: BrandHeadingSize;
  weight: BrandHeadingWeight;
  tracking: BrandHeadingTracking;
  align: BrandHeadingAlign;
  lineHeight: BrandHeadingLineHeight;
  eyebrowUppercase: boolean;
};

/** Invite hero copy field limits (must match email-branding-actions zod). */
export const HERO_EYEBROW_MAX = 120;
export const HERO_TITLE_MAX = 160;

export const BRAND_HEADING_SIZE_MIN = 24;
export const BRAND_HEADING_SIZE_MAX = 120;
export const BRAND_HEADING_SIZE_DEFAULT = 54;

/** Common sizes shown in the size dropdown (Canva-style). */
export const BRAND_HEADING_SIZE_PRESETS = [
  32, 36, 40, 44, 48, 54, 60, 64, 72, 84, 96,
] as const;

const LEGACY_SIZE_PX: Record<string, number> = {
  xs: 40,
  sm: 44,
  md: 54,
  lg: 64,
  xl: 72,
};

export const BRAND_HEADING_FONTS: {
  id: Exclude<BrandHeadingFont, "serif" | "modern">;
  label: string;
  group: "Sans" | "Serif" | "Display";
  /** CSS font-family stack for public pages (uses next/font CSS variables). */
  cssFamily: string;
}[] = [
  {
    id: "inter",
    label: "Inter",
    group: "Sans",
    cssFamily: "var(--font-inter), ui-sans-serif, system-ui, sans-serif",
  },
  {
    id: "dm-sans",
    label: "DM Sans",
    group: "Sans",
    cssFamily: "var(--font-brand-modern), ui-sans-serif, system-ui, sans-serif",
  },
  {
    id: "manrope",
    label: "Manrope",
    group: "Sans",
    cssFamily: "var(--font-brand-manrope), ui-sans-serif, system-ui, sans-serif",
  },
  {
    id: "jakarta",
    label: "Jakarta",
    group: "Sans",
    cssFamily:
      "var(--font-brand-jakarta), ui-sans-serif, system-ui, sans-serif",
  },
  {
    id: "space-grotesk",
    label: "Space Grotesk",
    group: "Display",
    cssFamily:
      "var(--font-brand-space-grotesk), ui-sans-serif, system-ui, sans-serif",
  },
  {
    id: "outfit",
    label: "Outfit",
    group: "Display",
    cssFamily: "var(--font-outfit), ui-sans-serif, system-ui, sans-serif",
  },
  {
    id: "source-serif",
    label: "Source Serif",
    group: "Serif",
    cssFamily: "var(--font-brand-serif), ui-serif, Georgia, serif",
  },
  {
    id: "playfair",
    label: "Playfair",
    group: "Serif",
    cssFamily: "var(--font-playfair), ui-serif, Georgia, serif",
  },
];

export const BRAND_HEADING_WEIGHTS: {
  id: BrandHeadingWeight;
  label: string;
  css: number;
}[] = [
  { id: "regular", label: "Regular", css: 400 },
  { id: "medium", label: "Medium", css: 500 },
  { id: "semibold", label: "Semibold", css: 600 },
  { id: "bold", label: "Bold", css: 700 },
];

export const BRAND_HEADING_TRACKING: {
  id: BrandHeadingTracking;
  label: string;
  css: string;
  /** Extra advance fraction of fontSize for hero path glyphs */
  heroEm: number;
}[] = [
  { id: "tight", label: "Tight", css: "-0.03em", heroEm: -0.03 },
  { id: "normal", label: "Normal", css: "0em", heroEm: 0 },
  { id: "wide", label: "Wide", css: "0.06em", heroEm: 0.04 },
];

export const BRAND_HEADING_ALIGNS: {
  id: BrandHeadingAlign;
  label: string;
}[] = [
  { id: "left", label: "Left" },
  { id: "center", label: "Centre" },
];

export const BRAND_HEADING_LINE_HEIGHTS: {
  id: BrandHeadingLineHeight;
  label: string;
  /** CSS unitless line-height for titles */
  css: number;
  /** Multiplier of title px for hero PNG title line advance */
  hero: number;
}[] = [
  { id: "tight", label: "Tight", css: 1.05, hero: 1.05 },
  { id: "normal", label: "Normal", css: 1.18, hero: 1.18 },
  { id: "relaxed", label: "Relaxed", css: 1.35, hero: 1.35 },
];

/** Clamp focal point percent (0–100). */
export function parseFocalPercent(value: unknown, fallback = 50): number {
  const n =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number.parseInt(value, 10)
        : Number.NaN;
  if (!Number.isFinite(n)) return fallback;
  return Math.min(100, Math.max(0, Math.round(n)));
}

export function normalizeBrandHeadingFont(value: unknown): BrandHeadingFont {
  if (value === "serif" || value === "source-serif") return "source-serif";
  if (value === "modern" || value === "dm-sans") return "dm-sans";
  if (
    value === "inter" ||
    value === "manrope" ||
    value === "jakarta" ||
    value === "space-grotesk" ||
    value === "playfair" ||
    value === "outfit"
  ) {
    return value;
  }
  return "inter";
}

export function parseBrandHeadingFont(value: unknown): BrandHeadingFont {
  return normalizeBrandHeadingFont(value);
}

export function clampBrandHeadingSize(px: number): BrandHeadingSize {
  if (!Number.isFinite(px)) return BRAND_HEADING_SIZE_DEFAULT;
  return Math.min(
    BRAND_HEADING_SIZE_MAX,
    Math.max(BRAND_HEADING_SIZE_MIN, Math.round(px)),
  );
}

/** Accepts legacy presets (xs–xl) or a numeric px string/number. */
export function parseBrandHeadingSize(value: unknown): BrandHeadingSize {
  if (typeof value === "number") return clampBrandHeadingSize(value);
  if (typeof value === "string") {
    const trimmed = value.trim().toLowerCase();
    if (trimmed in LEGACY_SIZE_PX) {
      return LEGACY_SIZE_PX[trimmed]!;
    }
    const n = Number.parseFloat(trimmed);
    if (Number.isFinite(n)) return clampBrandHeadingSize(n);
  }
  return BRAND_HEADING_SIZE_DEFAULT;
}

export function formatBrandHeadingSize(size: BrandHeadingSize): string {
  return String(clampBrandHeadingSize(size));
}

export function parseBrandHeadingWeight(value: unknown): BrandHeadingWeight {
  if (
    value === "regular" ||
    value === "medium" ||
    value === "semibold" ||
    value === "bold"
  ) {
    return value;
  }
  return "bold";
}

export function parseBrandHeadingTracking(
  value: unknown,
): BrandHeadingTracking {
  if (value === "tight" || value === "normal" || value === "wide") return value;
  return "normal";
}

export function parseBrandHeadingAlign(value: unknown): BrandHeadingAlign {
  if (value === "left" || value === "center") return value;
  return "center";
}

export function parseBrandHeadingLineHeight(
  value: unknown,
): BrandHeadingLineHeight {
  if (value === "tight" || value === "normal" || value === "relaxed") {
    return value;
  }
  return "normal";
}

export function parseBrandHeadingEyebrowUppercase(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const v = value.trim().toLowerCase();
    if (["true", "on", "1", "yes"].includes(v)) return true;
    if (["false", "off", "0", "no"].includes(v)) return false;
  }
  return true;
}

export function parseBrandHeadingColor(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (/^#([0-9A-Fa-f]{6}|[0-9A-Fa-f]{3})$/.test(trimmed)) {
    const hex =
      trimmed.length === 4
        ? `#${trimmed[1]}${trimmed[1]}${trimmed[2]}${trimmed[2]}${trimmed[3]}${trimmed[3]}`
        : trimmed;
    return hex.toUpperCase();
  }
  return null;
}

export function resolveBrandHeadingStyle(input: {
  color?: string | null;
  font?: string | null;
  size?: string | number | null;
  weight?: string | null;
  tracking?: string | null;
  align?: string | null;
  lineHeight?: string | null;
  eyebrowUppercase?: boolean | string | null;
}): BrandHeadingStyle {
  return {
    color: parseBrandHeadingColor(input.color ?? null),
    font: parseBrandHeadingFont(input.font),
    size: parseBrandHeadingSize(input.size),
    weight: parseBrandHeadingWeight(input.weight),
    tracking: parseBrandHeadingTracking(input.tracking),
    align: parseBrandHeadingAlign(input.align),
    lineHeight: parseBrandHeadingLineHeight(input.lineHeight),
    eyebrowUppercase: parseBrandHeadingEyebrowUppercase(
      input.eyebrowUppercase ?? true,
    ),
  };
}

export function brandHeadingCssFamily(font: BrandHeadingFont): string {
  const id = normalizeBrandHeadingFont(font);
  return (
    BRAND_HEADING_FONTS.find((f) => f.id === id)?.cssFamily ??
    BRAND_HEADING_FONTS[0]!.cssFamily
  );
}

export function brandHeadingCssWeight(weight: BrandHeadingWeight): number {
  return (
    BRAND_HEADING_WEIGHTS.find((w) => w.id === weight)?.css ?? 700
  );
}

export function brandHeadingCssTracking(
  tracking: BrandHeadingTracking,
): string {
  return (
    BRAND_HEADING_TRACKING.find((t) => t.id === tracking)?.css ?? "0em"
  );
}

export function brandHeadingHeroTrackingEm(
  tracking: BrandHeadingTracking,
): number {
  return (
    BRAND_HEADING_TRACKING.find((t) => t.id === tracking)?.heroEm ?? 0
  );
}

export function brandHeadingCssLineHeight(
  lineHeight: BrandHeadingLineHeight,
): number {
  return (
    BRAND_HEADING_LINE_HEIGHTS.find((l) => l.id === lineHeight)?.css ?? 1.18
  );
}

export function brandHeadingHeroLineHeight(
  lineHeight: BrandHeadingLineHeight,
): number {
  return (
    BRAND_HEADING_LINE_HEIGHTS.find((l) => l.id === lineHeight)?.hero ?? 1.18
  );
}

export function brandHeadingCssTextAlign(
  align: BrandHeadingAlign,
): "left" | "center" {
  return align === "left" ? "left" : "center";
}

/** Public-page title size derived from hero reference px. */
export function brandHeadingPublicTitlePx(size: BrandHeadingSize): number {
  return Math.round(
    Math.min(56, Math.max(18, clampBrandHeadingSize(size) * 0.55)),
  );
}

/** Public-page eyebrow size derived from hero reference px. */
export function brandHeadingPublicEyebrowPx(size: BrandHeadingSize): number {
  return Math.round(
    Math.min(16, Math.max(10, clampBrandHeadingSize(size) * 0.22)),
  );
}

/** @deprecated Prefer inline fontSize from brandHeadingPublicTitlePx */
export function brandHeadingTitleClass(_size: BrandHeadingSize): string {
  return "leading-tight";
}

/** @deprecated Prefer inline fontSize from brandHeadingPublicEyebrowPx */
export function brandHeadingEyebrowClass(_size: BrandHeadingSize): string {
  return "font-semibold uppercase";
}

/** Preview panel title size (scaled down from hero reference). */
export function brandHeadingPreviewTitlePx(size: BrandHeadingSize): number {
  return Math.round(
    Math.min(40, Math.max(16, clampBrandHeadingSize(size) * 0.42)),
  );
}

/** Pixel sizes for sharp / opentype hero compose, scaled from title px. */
export function heroTypeScale(
  size: BrandHeadingSize,
  lineHeight: BrandHeadingLineHeight = "normal",
): {
  eyebrow: number;
  title: number;
  titleLine: number;
  detail: number;
  detailLine: number;
  closing: number;
  wrapTitle: number;
  wrapDetail: number;
} {
  const title = clampBrandHeadingSize(size);
  const r = title / BRAND_HEADING_SIZE_DEFAULT;
  const lh = brandHeadingHeroLineHeight(lineHeight);
  return {
    eyebrow: Math.round(28 * r),
    title,
    titleLine: Math.round(title * lh),
    detail: Math.round(30 * r),
    detailLine: Math.round(42 * r * (lh / 1.18)),
    closing: Math.round(28 * r),
    wrapTitle: Math.max(18, Math.round(28 / r)),
    wrapDetail: Math.max(22, Math.round(34 / r)),
  };
}

/**
 * Default heading colour when none is saved.
 * onAccent = white text on coloured / photo card; otherwise dark slate.
 */
export function defaultHeadingColor(onAccent: boolean): string {
  return onAccent ? "#FFFFFF" : "#0F172A";
}

export function objectPositionCss(focalX: number, focalY: number): string {
  return `${parseFocalPercent(focalX)}% ${parseFocalPercent(focalY)}%`;
}

/** Map UI weight to hero path style (regular / medium / semibold / bold TTFs). */
export function heroWeightStyle(
  weight: BrandHeadingWeight,
): "regular" | "medium" | "semibold" | "bold" {
  return weight;
}
