import type { CSSProperties } from "react";
import { parseEventSiteFont, type EventSiteFontId, EVENT_SITE_FONT_CSS } from "./fonts";

export const EVENT_SITE_COLOR_SWATCHES = [
  { label: "Slate 900", value: "#0F172A" },
  { label: "Slate 700", value: "#334155" },
  { label: "Slate 600", value: "#475569" },
  { label: "Slate 400", value: "#94A3B8" },
  { label: "Slate 50", value: "#F8FAFC" },
  { label: "Indigo 600", value: "#4F46E5" },
  { label: "Indigo 700", value: "#4338CA" },
  { label: "Violet 500", value: "#8B5CF6" },
  { label: "Rose 500", value: "#F43F5E" },
  { label: "Teal 500", value: "#14B8A6" },
  { label: "Amber 500", value: "#F59E0B" },
  { label: "White", value: "#FFFFFF" },
] as const;

export const EVENT_SITE_THEME_PRESETS = [
  "modern",
  "corporate",
  "elegant",
  "bold",
  "minimal",
] as const;

export type EventSiteThemePreset = (typeof EVENT_SITE_THEME_PRESETS)[number];

const HEX_RE = /^#([0-9A-Fa-f]{6}|[0-9A-Fa-f]{3})$/;

export function parseSiteHexColor(value: unknown, fallback: string): string {
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

export type EventSiteThemeTokens = {
  preset: EventSiteThemePreset;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  textColor: string;
  headingFont: EventSiteFontId;
  bodyFont: EventSiteFontId;
};

export const THEME_PRESET_VALUES: Record<
  EventSiteThemePreset,
  Omit<EventSiteThemeTokens, "preset">
> = {
  modern: {
    primaryColor: "#0F172A",
    secondaryColor: "#334155",
    accentColor: "#4F46E5",
    backgroundColor: "#FFFFFF",
    textColor: "#475569",
    headingFont: "inter",
    bodyFont: "inter",
  },
  corporate: {
    primaryColor: "#1E293B",
    secondaryColor: "#475569",
    accentColor: "#4338CA",
    backgroundColor: "#F8FAFC",
    textColor: "#475569",
    headingFont: "plus-jakarta",
    bodyFont: "dm-sans",
  },
  elegant: {
    primaryColor: "#1C1917",
    secondaryColor: "#57534E",
    accentColor: "#92400E",
    backgroundColor: "#FFFBEB",
    textColor: "#57534E",
    headingFont: "playfair",
    bodyFont: "merriweather",
  },
  bold: {
    primaryColor: "#0F172A",
    secondaryColor: "#4F46E5",
    accentColor: "#F43F5E",
    backgroundColor: "#FFFFFF",
    textColor: "#334155",
    headingFont: "space-grotesk",
    bodyFont: "manrope",
  },
  minimal: {
    primaryColor: "#18181B",
    secondaryColor: "#71717A",
    accentColor: "#18181B",
    backgroundColor: "#FFFFFF",
    textColor: "#52525B",
    headingFont: "inter",
    bodyFont: "inter",
  },
};

export const DEFAULT_EVENT_SITE_THEME: EventSiteThemeTokens = {
  preset: "modern",
  ...THEME_PRESET_VALUES.modern,
};

export function applyThemePreset(
  preset: EventSiteThemePreset,
): EventSiteThemeTokens {
  return { preset, ...THEME_PRESET_VALUES[preset] };
}

export function normalizeTheme(
  theme: Partial<EventSiteThemeTokens> & { accentColor?: string; heroColor?: string },
): EventSiteThemeTokens {
  const preset =
    theme.preset && EVENT_SITE_THEME_PRESETS.includes(theme.preset)
      ? theme.preset
      : DEFAULT_EVENT_SITE_THEME.preset;
  const base = THEME_PRESET_VALUES[preset];

  return {
    preset,
    primaryColor: parseSiteHexColor(
      theme.primaryColor ?? theme.heroColor ?? base.primaryColor,
      base.primaryColor,
    ),
    secondaryColor: parseSiteHexColor(
      theme.secondaryColor ?? base.secondaryColor,
      base.secondaryColor,
    ),
    accentColor: parseSiteHexColor(theme.accentColor ?? base.accentColor, base.accentColor),
    backgroundColor: parseSiteHexColor(
      theme.backgroundColor ?? base.backgroundColor,
      base.backgroundColor,
    ),
    textColor: parseSiteHexColor(theme.textColor ?? base.textColor, base.textColor),
    headingFont: parseEventSiteFont(theme.headingFont, base.headingFont),
    bodyFont: parseEventSiteFont(theme.bodyFont, base.bodyFont),
  };
}

export type EventSiteGlobalStyles = {
  buttonStyle: "solid" | "outline" | "ghost";
  borderRadius: "none" | "sm" | "md" | "lg" | "full";
  sectionSpacing: "compact" | "normal" | "spacious";
  containerWidth: "narrow" | "default" | "wide";
  navStyle: "transparent" | "solid" | "sticky-light" | "sticky-dark";
};

export const DEFAULT_GLOBAL_STYLES: EventSiteGlobalStyles = {
  buttonStyle: "solid",
  borderRadius: "full",
  sectionSpacing: "normal",
  containerWidth: "default",
  navStyle: "sticky-light",
};

export const BORDER_RADIUS_CSS: Record<EventSiteGlobalStyles["borderRadius"], string> = {
  none: "0",
  sm: "0.375rem",
  md: "0.75rem",
  lg: "1rem",
  full: "9999px",
};

export const SECTION_SPACING_CSS: Record<
  EventSiteGlobalStyles["sectionSpacing"],
  string
> = {
  compact: "3rem",
  normal: "4.5rem",
  spacious: "6rem",
};

export const CONTAINER_WIDTH_CSS: Record<
  EventSiteGlobalStyles["containerWidth"],
  string
> = {
  narrow: "48rem",
  default: "72rem",
  wide: "80rem",
};

export function eventSiteThemeStyle(
  theme: EventSiteThemeTokens,
  globalStyles: EventSiteGlobalStyles = DEFAULT_GLOBAL_STYLES,
): CSSProperties {
  return {
    "--site-primary": theme.primaryColor,
    "--site-secondary": theme.secondaryColor,
    "--site-accent": theme.accentColor,
    "--site-bg": theme.backgroundColor,
    "--site-text": theme.textColor,
    "--site-heading-font": EVENT_SITE_FONT_CSS[theme.headingFont],
    "--site-body-font": EVENT_SITE_FONT_CSS[theme.bodyFont],
    "--site-radius": BORDER_RADIUS_CSS[globalStyles.borderRadius],
    "--site-section-py": SECTION_SPACING_CSS[globalStyles.sectionSpacing],
    "--site-container": CONTAINER_WIDTH_CSS[globalStyles.containerWidth],
    backgroundColor: theme.backgroundColor,
    color: theme.textColor,
    fontFamily: EVENT_SITE_FONT_CSS[theme.bodyFont],
  } as CSSProperties;
}
