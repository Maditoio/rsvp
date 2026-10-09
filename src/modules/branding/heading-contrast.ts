import { contrastRatio } from "@/modules/badges/colors";

/** WCAG AA for large text is 3:1 — headings qualify. */
export const HEADING_CONTRAST_MIN = 3;

export function headingContrastOk(
  foreground: string,
  background: string,
  min = HEADING_CONTRAST_MIN,
): boolean {
  return contrastRatio(foreground, background) >= min;
}

/** Pick white or dark slate for best contrast on a solid background. */
export function suggestHeadingColor(background: string): "#FFFFFF" | "#0F172A" {
  const white = contrastRatio("#FFFFFF", background);
  const dark = contrastRatio("#0F172A", background);
  return white >= dark ? "#FFFFFF" : "#0F172A";
}

/**
 * Approximate the dark veil over a photo so we can warn about heading colour.
 * `overlay` is the bottom stop opacity 0–100 (same as emailHeroOverlay).
 */
export function photoOverlayBackground(overlay: number): string {
  const bottom = Math.min(100, Math.max(0, overlay)) / 100;
  // Assume a mid-grey photo, darkened by the bottom veil.
  const photo = 0.5;
  const channel = Math.round(255 * photo * (1 - bottom));
  const hex = channel.toString(16).padStart(2, "0");
  return `#${hex}${hex}${hex}`;
}

/** Blend two stops for gradient contrast checks. */
export function blendHex(a: string, b: string, t = 0.5): string {
  const parse = (hex: string) => {
    const h = hex.replace("#", "");
    const full =
      h.length === 3
        ? h
            .split("")
            .map((c) => c + c)
            .join("")
        : h;
    return {
      r: Number.parseInt(full.slice(0, 2), 16),
      g: Number.parseInt(full.slice(2, 4), 16),
      b: Number.parseInt(full.slice(4, 6), 16),
    };
  };
  const A = parse(a);
  const B = parse(b);
  const mix = (x: number, y: number) => Math.round(x + (y - x) * t);
  const to = (n: number) => n.toString(16).padStart(2, "0");
  return `#${to(mix(A.r, B.r))}${to(mix(A.g, B.g))}${to(mix(A.b, B.b))}`;
}

export function heroOverlayStops(overlay: number): {
  top: number;
  mid: number;
  bottom: number;
} {
  const bottom = Math.min(100, Math.max(0, Math.round(overlay))) / 100;
  return {
    top: bottom * (0.18 / 0.55),
    mid: bottom * (0.28 / 0.55),
    bottom,
  };
}
