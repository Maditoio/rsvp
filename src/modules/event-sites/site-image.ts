import type { CSSProperties } from "react";
import { BORDER_RADIUS_CSS } from "./theme";

export const SITE_IMAGE_FITS = ["cover", "contain", "fill"] as const;
export type SiteImageFit = (typeof SITE_IMAGE_FITS)[number];

export const SITE_IMAGE_POSITIONS = [
  "center",
  "top",
  "bottom",
  "left",
  "right",
] as const;
export type SiteImagePosition = (typeof SITE_IMAGE_POSITIONS)[number];

export const SITE_IMAGE_RADIUS = ["none", "sm", "lg", "full"] as const;
export type SiteImageRadius = (typeof SITE_IMAGE_RADIUS)[number];

export const SITE_IMAGE_RADIUS_LABELS: Record<SiteImageRadius, string> = {
  none: "Square",
  sm: "Slightly rounded",
  lg: "Rounded",
  full: "Circle / pill",
};

export const DEFAULT_SITE_IMAGE_DISPLAY = {
  imageFit: "cover" as SiteImageFit,
  imagePosition: "center" as SiteImagePosition,
  imageRadius: "none" as SiteImageRadius,
};

const POSITION_MAP: Record<SiteImagePosition, string> = {
  center: "center center",
  top: "center top",
  bottom: "center bottom",
  left: "left center",
  right: "right center",
};

export function parseSiteImageFit(value: unknown): SiteImageFit {
  return SITE_IMAGE_FITS.includes(value as SiteImageFit)
    ? (value as SiteImageFit)
    : DEFAULT_SITE_IMAGE_DISPLAY.imageFit;
}

export function parseSiteImagePosition(value: unknown): SiteImagePosition {
  return SITE_IMAGE_POSITIONS.includes(value as SiteImagePosition)
    ? (value as SiteImagePosition)
    : DEFAULT_SITE_IMAGE_DISPLAY.imagePosition;
}

export function parseSiteImageRadius(value: unknown): SiteImageRadius {
  return SITE_IMAGE_RADIUS.includes(value as SiteImageRadius)
    ? (value as SiteImageRadius)
    : DEFAULT_SITE_IMAGE_DISPLAY.imageRadius;
}

export function siteImageRadiusValue(radius: unknown): string {
  const parsed = parseSiteImageRadius(radius);
  if (parsed === "none") return "0";
  if (parsed === "sm") return BORDER_RADIUS_CSS.md;
  if (parsed === "full") return "9999px";
  return "var(--site-radius)";
}

export function siteImageObjectStyles(
  content: Record<string, unknown>,
): Pick<CSSProperties, "objectFit" | "objectPosition"> {
  const fit = parseSiteImageFit(content.imageFit);
  const position = parseSiteImagePosition(content.imagePosition);
  return {
    objectFit: fit,
    objectPosition: POSITION_MAP[position],
  };
}

export function siteImageStyles(
  content: Record<string, unknown>,
): Pick<CSSProperties, "objectFit" | "objectPosition" | "borderRadius"> {
  return {
    ...siteImageObjectStyles(content),
    borderRadius: siteImageRadiusValue(content.imageRadius),
  };
}

/** Speaker photos never use pill/circle radii — layout controls shape. */
export function speakerPhotoStyles(
  content: Record<string, unknown>,
): Pick<CSSProperties, "objectFit" | "objectPosition" | "borderRadius"> {
  return {
    ...siteImageObjectStyles(content),
    borderRadius: "0",
  };
}

/** Merge section defaults with optional per-item overrides (e.g. gallery images). */
export function resolveImageDisplay(
  sectionContent: Record<string, unknown>,
  itemOverrides?: Record<string, unknown>,
): Record<string, unknown> {
  return {
    imageFit: itemOverrides?.imageFit ?? sectionContent.imageFit,
    imagePosition: itemOverrides?.imagePosition ?? sectionContent.imagePosition,
    imageRadius: itemOverrides?.imageRadius ?? sectionContent.imageRadius,
  };
}
