/** Shared heading style for public invite/register pages and invitation hero PNG. */

export type BrandHeadingFont = "inter" | "serif" | "modern";
export type BrandHeadingSize = "sm" | "md" | "lg";

export type BrandHeadingStyle = {
  color: string | null;
  font: BrandHeadingFont;
  size: BrandHeadingSize;
};

export const BRAND_HEADING_FONTS: {
  id: BrandHeadingFont;
  label: string;
  /** CSS font-family stack for public pages (uses next/font CSS variables). */
  cssFamily: string;
}[] = [
  {
    id: "inter",
    label: "Inter",
    cssFamily: "var(--font-inter), ui-sans-serif, system-ui, sans-serif",
  },
  {
    id: "serif",
    label: "Serif",
    cssFamily: "var(--font-brand-serif), ui-serif, Georgia, serif",
  },
  {
    id: "modern",
    label: "Modern",
    cssFamily: "var(--font-brand-modern), ui-sans-serif, system-ui, sans-serif",
  },
];

export const BRAND_HEADING_SIZES: {
  id: BrandHeadingSize;
  label: string;
}[] = [
  { id: "sm", label: "S" },
  { id: "md", label: "M" },
  { id: "lg", label: "L" },
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

export function parseBrandHeadingFont(value: unknown): BrandHeadingFont {
  if (value === "inter" || value === "serif" || value === "modern") return value;
  return "inter";
}

export function parseBrandHeadingSize(value: unknown): BrandHeadingSize {
  if (value === "sm" || value === "md" || value === "lg") return value;
  return "md";
}

export function parseBrandHeadingColor(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (/^#([0-9A-Fa-f]{6}|[0-9A-Fa-f]{3})$/.test(trimmed)) {
    const hex = trimmed.length === 4
      ? `#${trimmed[1]}${trimmed[1]}${trimmed[2]}${trimmed[2]}${trimmed[3]}${trimmed[3]}`
      : trimmed;
    return hex.toUpperCase();
  }
  return null;
}

export function resolveBrandHeadingStyle(input: {
  color?: string | null;
  font?: string | null;
  size?: string | null;
}): BrandHeadingStyle {
  return {
    color: parseBrandHeadingColor(input.color ?? null),
    font: parseBrandHeadingFont(input.font),
    size: parseBrandHeadingSize(input.size),
  };
}

export function brandHeadingCssFamily(font: BrandHeadingFont): string {
  return (
    BRAND_HEADING_FONTS.find((f) => f.id === font)?.cssFamily ??
    BRAND_HEADING_FONTS[0]!.cssFamily
  );
}

/** Tailwind-ish class sizes for public page h1. */
export function brandHeadingTitleClass(size: BrandHeadingSize): string {
  switch (size) {
    case "sm":
      return "text-2xl sm:text-3xl";
    case "lg":
      return "text-4xl sm:text-5xl";
    default:
      return "text-3xl sm:text-4xl";
  }
}

export function brandHeadingEyebrowClass(size: BrandHeadingSize): string {
  switch (size) {
    case "sm":
      return "text-[0.625rem]";
    case "lg":
      return "text-xs";
    default:
      return "text-[0.6875rem]";
  }
}

/** Pixel sizes for sharp / opentype hero compose. */
export function heroTypeScale(size: BrandHeadingSize): {
  eyebrow: number;
  title: number;
  titleLine: number;
  detail: number;
  detailLine: number;
  closing: number;
  wrapTitle: number;
  wrapDetail: number;
} {
  switch (size) {
    case "sm":
      return {
        eyebrow: 24,
        title: 44,
        titleLine: 52,
        detail: 26,
        detailLine: 36,
        closing: 24,
        wrapTitle: 30,
        wrapDetail: 36,
      };
    case "lg":
      return {
        eyebrow: 32,
        title: 64,
        titleLine: 76,
        detail: 34,
        detailLine: 48,
        closing: 32,
        wrapTitle: 24,
        wrapDetail: 30,
      };
    default:
      return {
        eyebrow: 28,
        title: 54,
        titleLine: 64,
        detail: 30,
        detailLine: 42,
        closing: 28,
        wrapTitle: 28,
        wrapDetail: 34,
      };
  }
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
