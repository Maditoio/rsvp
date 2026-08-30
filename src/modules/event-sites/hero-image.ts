import type { CSSProperties } from "react";
import {
  parseSiteImageFit,
  parseSiteImagePosition,
  siteImageRadiusValue,
  type SiteImageRadius,
} from "./site-image";

export {
  SITE_IMAGE_FITS as HERO_IMAGE_FITS,
  SITE_IMAGE_POSITIONS as HERO_IMAGE_POSITIONS,
  type SiteImageFit as HeroImageFit,
  type SiteImagePosition as HeroImagePosition,
} from "./site-image";

export const HERO_SPLIT_IMAGE_RADIUS = ["none", "lg", "full"] as const;
export type HeroSplitImageRadius = (typeof HERO_SPLIT_IMAGE_RADIUS)[number];

export const HERO_SPLIT_IMAGE_WIDTH = ["full", "inset"] as const;
export type HeroSplitImageWidth = (typeof HERO_SPLIT_IMAGE_WIDTH)[number];

export const HERO_SPLIT_MIN_HEIGHTS = [
  { value: "auto", label: "Auto" },
  { value: "280px", label: "Short" },
  { value: "360px", label: "Medium" },
  { value: "480px", label: "Tall" },
] as const;

const POSITION_MAP: Record<string, string> = {
  center: "center center",
  top: "center top",
  bottom: "center bottom",
  left: "left center",
  right: "right center",
};

export function parseHeroImageFit(value: unknown) {
  return parseSiteImageFit(value);
}

export function parseHeroImagePosition(value: unknown) {
  return parseSiteImagePosition(value);
}

export function heroImageObjectStyles(
  content: Record<string, unknown>,
): Pick<CSSProperties, "objectFit" | "objectPosition"> {
  const fit = parseHeroImageFit(content.imageFit);
  const position = parseHeroImagePosition(content.imagePosition);
  return {
    objectFit: fit,
    objectPosition: POSITION_MAP[position] ?? "center center",
  };
}

export function heroOverlayOpacity(content: Record<string, unknown>): number {
  const raw = content.overlayStrength;
  if (typeof raw === "number" && Number.isFinite(raw)) {
    return Math.min(100, Math.max(0, raw)) / 100;
  }
  return 1;
}

export function heroSplitImageRadius(
  content: Record<string, unknown>,
): string {
  return siteImageRadiusValue(content.imageRadius as SiteImageRadius | undefined);
}

export function heroSplitMinHeight(content: Record<string, unknown>): string | undefined {
  const value = content.imageMinHeight;
  if (typeof value === "string" && value !== "auto") return value;
  return undefined;
}

export function heroFullMinHeight(content: Record<string, unknown>): string {
  const value = content.heroMinHeight;
  if (typeof value === "string" && value.trim()) return value;
  return "min(72vh, 800px)";
}
