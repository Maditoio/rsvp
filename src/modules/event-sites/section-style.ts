import type { CSSProperties } from "react";
import { parseSiteHexColor } from "./theme";

export const SECTION_BACKGROUND_VALUES = [
  "theme",
  "white",
  "muted",
  "custom",
  "image",
] as const;
export type SectionBackground = (typeof SECTION_BACKGROUND_VALUES)[number];

export const SECTION_BACKGROUND_OPTIONS: { value: SectionBackground; label: string }[] = [
  { value: "theme", label: "Theme" },
  { value: "white", label: "White" },
  { value: "muted", label: "Light grey" },
  { value: "custom", label: "Custom colour" },
  { value: "image", label: "Image" },
];

export const SECTION_BACKGROUND_OVERLAY_VALUES = ["none", "dark", "gradient"] as const;
export type SectionBackgroundOverlay = (typeof SECTION_BACKGROUND_OVERLAY_VALUES)[number];

export const SECTION_BACKGROUND_OVERLAY_OPTIONS: {
  value: SectionBackgroundOverlay;
  label: string;
}[] = [
  { value: "none", label: "None" },
  { value: "dark", label: "Dark tint" },
  { value: "gradient", label: "Gradient fade" },
];

export const SECTION_TEXT_COLOR_VALUES = ["auto", "light"] as const;
export type SectionTextColor = (typeof SECTION_TEXT_COLOR_VALUES)[number];

export const SECTION_TEXT_COLOR_OPTIONS: { value: SectionTextColor; label: string }[] = [
  { value: "auto", label: "Auto" },
  { value: "light", label: "Light (for photos)" },
];

export const SECTION_TEXT_ALIGN_VALUES = ["left", "center", "right"] as const;
export type SectionTextAlign = (typeof SECTION_TEXT_ALIGN_VALUES)[number];

export const TEXT_ALIGN_OPTIONS: { value: SectionTextAlign; label: string }[] = [
  { value: "left", label: "Left" },
  { value: "center", label: "Center" },
  { value: "right", label: "Right" },
];

export function getSectionBackgroundValue(content: Record<string, unknown>): SectionBackground {
  const value = content.background;
  return SECTION_BACKGROUND_VALUES.includes(value as SectionBackground)
    ? (value as SectionBackground)
    : "theme";
}

export function getSectionBackgroundOverlay(
  content: Record<string, unknown>,
  fallback: SectionBackgroundOverlay = "dark",
): SectionBackgroundOverlay {
  const value = content.backgroundOverlay;
  return SECTION_BACKGROUND_OVERLAY_VALUES.includes(value as SectionBackgroundOverlay)
    ? (value as SectionBackgroundOverlay)
    : fallback;
}

export function getSectionBackgroundOverlayStrength(
  content: Record<string, unknown>,
  fallback = 45,
): number {
  const value = content.backgroundOverlayStrength;
  return typeof value === "number" && value >= 0 && value <= 100 ? value : fallback;
}

export function getSectionTextColor(
  content: Record<string, unknown>,
  fallback: SectionTextColor = "auto",
): SectionTextColor {
  const value = content.backgroundTextColor;
  return SECTION_TEXT_COLOR_VALUES.includes(value as SectionTextColor)
    ? (value as SectionTextColor)
    : fallback;
}

export function getSectionTextAlign(
  content: Record<string, unknown>,
  fallback: SectionTextAlign = "left",
): SectionTextAlign {
  const value = content.textAlign;
  return SECTION_TEXT_ALIGN_VALUES.includes(value as SectionTextAlign)
    ? (value as SectionTextAlign)
    : fallback;
}

function overlayGradient(content: Record<string, unknown>): string | null {
  const overlay = getSectionBackgroundOverlay(content, "none");
  const strength = getSectionBackgroundOverlayStrength(content) / 100;
  if (overlay === "dark") {
    return `linear-gradient(rgba(15,23,42,${strength}), rgba(15,23,42,${strength}))`;
  }
  if (overlay === "gradient") {
    return `linear-gradient(180deg, rgba(15,23,42,${strength}) 0%, rgba(15,23,42,${strength * 0.4}) 55%, rgba(15,23,42,0) 100%)`;
  }
  return null;
}

const LIGHT_TEXT_CLASS =
  "text-white [&_h1]:!text-white [&_h2]:!text-white [&_h3]:!text-white [&_a]:!text-white";

/** Resolves the wrapper background for a section. `fallbackClassName` is the
 * layout's own default look (e.g. a muted band) used when background is "theme". */
export function resolveSectionBackground(
  content: Record<string, unknown>,
  fallbackClassName?: string,
): { className?: string; style?: CSSProperties } {
  const background = getSectionBackgroundValue(content);
  const lightText = getSectionTextColor(content) === "light";

  if (background === "white") return { className: "bg-white" };
  if (background === "muted") return { className: "bg-slate-50/80" };

  if (background === "custom") {
    return {
      className: lightText ? LIGHT_TEXT_CLASS : undefined,
      style: { backgroundColor: parseSiteHexColor(content.backgroundColor, "#FFFFFF") },
    };
  }

  if (background === "image") {
    const url =
      typeof content.backgroundImageUrl === "string" ? content.backgroundImageUrl : "";
    if (!url) return { className: fallbackClassName };
    const gradient = overlayGradient(content);
    return {
      className: lightText ? LIGHT_TEXT_CLASS : undefined,
      style: {
        backgroundImage: gradient ? `${gradient}, url(${url})` : `url(${url})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      },
    };
  }

  return { className: fallbackClassName };
}

export function textAlignClass(
  content: Record<string, unknown>,
  fallback: SectionTextAlign = "left",
): string {
  const align = getSectionTextAlign(content, fallback);
  if (align === "center") return "text-center";
  if (align === "right") return "text-right";
  return "text-left";
}

/** For flex rows (button groups) that should follow the text alignment. */
export function alignJustifyClass(
  content: Record<string, unknown>,
  fallback: SectionTextAlign = "left",
): string {
  const align = getSectionTextAlign(content, fallback);
  if (align === "center") return "justify-center";
  if (align === "right") return "justify-end";
  return "justify-start";
}

/** For fixed max-width text blocks that need repositioning, not just re-aligned text. */
export function alignBoxClass(
  content: Record<string, unknown>,
  fallback: SectionTextAlign = "left",
): string | undefined {
  const align = getSectionTextAlign(content, fallback);
  if (align === "center") return "mx-auto";
  if (align === "right") return "ml-auto";
  return undefined;
}
