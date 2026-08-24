/**
 * Badge font options.
 * These map to Google Fonts loaded in the root layout (next/font/google).
 * The CSS variable names are set on <html> and referenced here.
 */

export const BADGE_FONT_IDS = [
  "inter",
  "playfair",
  "dm-serif",
  "space-mono",
  "outfit",
] as const;

export type BadgeFontId = (typeof BADGE_FONT_IDS)[number];

export const BADGE_FONT_LABELS: Record<BadgeFontId, string> = {
  inter: "Inter (Sans)",
  playfair: "Playfair Display (Serif)",
  "dm-serif": "DM Serif Display",
  "space-mono": "Space Mono",
  outfit: "Outfit (Geometric)",
};

export const BADGE_FONT_CSS: Record<BadgeFontId, string> = {
  inter: "var(--font-inter), system-ui, sans-serif",
  playfair: "var(--font-playfair), serif",
  "dm-serif": "var(--font-dm-serif), serif",
  "space-mono": "var(--font-space-mono), monospace",
  outfit: "var(--font-outfit), system-ui, sans-serif",
};

export function parseBadgeFont(value: unknown, fallback: BadgeFontId = "inter"): BadgeFontId {
  if (typeof value === "string" && BADGE_FONT_IDS.includes(value as BadgeFontId)) {
    return value as BadgeFontId;
  }
  return fallback;
}
