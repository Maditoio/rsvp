import type { CSSProperties } from "react";

/** Badge colour / gradient helpers — Aurora palette first. */

export const BADGE_COLOR_SWATCHES = [
  { label: "Slate 900", value: "#0F172A" },
  { label: "Slate 700", value: "#334155" },
  { label: "Slate 600", value: "#475569" },
  { label: "Slate 400", value: "#94A3B8" },
  { label: "Indigo 600", value: "#4F46E5" },
  { label: "Indigo 700", value: "#4338CA" },
  { label: "Violet 500", value: "#8B5CF6" },
  { label: "Rose 500", value: "#F43F5E" },
  { label: "Teal 500", value: "#14B8A6" },
  { label: "Amber 500", value: "#F59E0B" },
  { label: "White", value: "#FFFFFF" },
] as const;

export const BADGE_GRADIENT_PRESETS = [
  {
    id: "indigo-violet",
    label: "Indigo → Violet",
    from: "#4F46E5",
    to: "#8B5CF6",
    angle: 135,
  },
  {
    id: "indigo-teal",
    label: "Indigo → Teal",
    from: "#4F46E5",
    to: "#14B8A6",
    angle: 120,
  },
  {
    id: "slate-indigo",
    label: "Slate → Indigo",
    from: "#0F172A",
    to: "#4F46E5",
    angle: 90,
  },
  {
    id: "rose-amber",
    label: "Rose → Amber",
    from: "#F43F5E",
    to: "#F59E0B",
    angle: 135,
  },
  {
    id: "teal-indigo",
    label: "Teal → Indigo",
    from: "#14B8A6",
    to: "#4F46E5",
    angle: 145,
  },
] as const;

export const TEXT_FILLS = ["solid", "gradient"] as const;
export type BadgeTextFill = (typeof TEXT_FILLS)[number];

/** Badge surface fill — solid, gradient, or uploaded background image. */
export const BADGE_BG_FILLS = ["solid", "gradient", "image"] as const;
export type BadgeBgFill = (typeof BADGE_BG_FILLS)[number];

const HEX_RE = /^#([0-9A-Fa-f]{6}|[0-9A-Fa-f]{3})$/;

export function parseHexColor(value: unknown, fallback: string): string {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  if (!HEX_RE.test(trimmed)) return fallback;
  if (trimmed.length === 4) {
    const r = trimmed[1]!;
    const g = trimmed[2]!;
    const b = trimmed[3]!;
    return `#${r}${r}${g}${g}${b}${b}`.toUpperCase();
  }
  return trimmed.toUpperCase();
}

export function parseTextFill(
  value: unknown,
  fallback: BadgeTextFill = "solid",
): BadgeTextFill {
  if (value === "solid" || value === "gradient") return value;
  return fallback;
}

export function parseBadgeBgFill(
  value: unknown,
  fallback: BadgeBgFill = "solid",
): BadgeBgFill {
  if (value === "solid" || value === "gradient" || value === "image") {
    return value;
  }
  return fallback;
}

/** Persistable background image URL (empty string = none). */
export function parseBadgeBgImageUrl(value: unknown): string {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 2000) return "";
  if (trimmed.startsWith("https://") || trimmed.startsWith("http://")) {
    return trimmed;
  }
  return "";
}

export function parseGradientAngle(value: unknown, fallback = 135): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(360, Math.max(0, Math.round(n)));
}

function luminance(hex: string): number {
  const normalized = parseHexColor(hex, "#000000").slice(1);
  const toLinear = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  const r = toLinear(parseInt(normalized.slice(0, 2), 16));
  const g = toLinear(parseInt(normalized.slice(2, 4), 16));
  const b = toLinear(parseInt(normalized.slice(4, 6), 16));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast ratio between two hex colours. */
export function contrastRatio(a: string, b: string): number {
  const l1 = luminance(a);
  const l2 = luminance(b);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

/** QR modules need strong contrast for scanners — warn below 3:1. */
export function qrColorsAreScannable(dark: string, light: string): boolean {
  return contrastRatio(dark, light) >= 3;
}

export function gradientTextStyle(
  from: string,
  to: string,
  angle: number,
): CSSProperties {
  return {
    backgroundImage: `linear-gradient(${angle}deg, ${from}, ${to})`,
    backgroundClip: "text",
    WebkitBackgroundClip: "text",
    color: "transparent",
    WebkitTextFillColor: "transparent",
  };
}

export function solidTextStyle(color: string): CSSProperties {
  return { color };
}

export function badgeBackgroundStyle(input: {
  fill: BadgeBgFill | BadgeTextFill;
  color: string;
  from: string;
  to: string;
  angle: number;
  /** When fill is `image` and URL is set, covers the badge surface. */
  imageUrl?: string | null;
}): CSSProperties {
  if (input.fill === "image" && input.imageUrl) {
    return {
      backgroundColor: input.color || "#FFFFFF",
      backgroundImage: `url(${JSON.stringify(input.imageUrl)})`,
      backgroundSize: "cover",
      backgroundPosition: "center",
      backgroundRepeat: "no-repeat",
    };
  }
  if (input.fill === "gradient") {
    return {
      backgroundImage: `linear-gradient(${input.angle}deg, ${input.from}, ${input.to})`,
      backgroundColor: input.from,
    };
  }
  return { backgroundColor: input.color };
}
