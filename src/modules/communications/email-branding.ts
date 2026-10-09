const HEX_RE = /^#([0-9A-Fa-f]{6}|[0-9A-Fa-f]{3})$/;

export type EmailBranding = {
  logoUrl: string | null;
  bannerUrl: string | null;
  accentColor: string;
  accentSoft: string;
  accentBorder: string;
  accentShadow: string;
  /** When true, emails use a full composed hero image (logo/text baked in). */
  heroCard?: boolean;
};

/** Matches Aurora indigo used in email-layout. */
export const DEFAULT_EMAIL_ACCENT = "#4F46E5";
export const DEFAULT_EMAIL_ACCENT_SOFT = "#EEF2FF";
export const DEFAULT_EMAIL_ACCENT_BORDER = "#C7D2FE";
export const DEFAULT_EMAIL_ACCENT_SHADOW =
  "0 4px 12px rgba(79,70,229,0.28)";

export function parseEmailHexColor(
  value: unknown,
  fallback = DEFAULT_EMAIL_ACCENT,
): string {
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

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const normalized = parseEmailHexColor(hex, "");
  if (!normalized || normalized.length !== 7) return null;
  const r = Number.parseInt(normalized.slice(1, 3), 16);
  const g = Number.parseInt(normalized.slice(3, 5), 16);
  const b = Number.parseInt(normalized.slice(5, 7), 16);
  if ([r, g, b].some((n) => Number.isNaN(n))) return null;
  return { r, g, b };
}

function mixWithWhite(hex: string, whiteRatio: number, fallback: string): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return fallback;
  const mix = (channel: number) =>
    Math.round(channel * (1 - whiteRatio) + 255 * whiteRatio);
  const toHex = (n: number) => n.toString(16).padStart(2, "0").toUpperCase();
  return `#${toHex(mix(rgb.r))}${toHex(mix(rgb.g))}${toHex(mix(rgb.b))}`;
}

/** Email clients often fail on SVG; only use raster/public URLs. */
export function emailSafeImageUrl(url: string | null | undefined): string | null {
  if (!url?.trim()) return null;
  const trimmed = url.trim();
  if (!/^https?:\/\//i.test(trimmed)) return null;
  if (/\.svg(\?|#|$)/i.test(trimmed)) return null;
  if (trimmed.toLowerCase().includes("image/svg")) return null;
  return trimmed;
}

/** @deprecated Prefer emailSafeImageUrl — kept for existing imports/tests. */
export function emailSafeLogoUrl(url: string | null | undefined): string | null {
  return emailSafeImageUrl(url);
}

export function accentFromWebsiteConfig(raw: unknown): string | null {
  if (!raw || typeof raw !== "object") return null;
  const theme = (raw as { theme?: unknown }).theme;
  if (!theme || typeof theme !== "object") return null;
  const accent = (theme as { accentColor?: unknown }).accentColor;
  if (typeof accent !== "string" || !HEX_RE.test(accent.trim())) return null;
  return parseEmailHexColor(accent);
}

export function resolveEmailBranding(input: {
  logoUrl?: string | null;
  bannerUrl?: string | null;
  emailAccentColor?: string | null;
  websiteConfig?: unknown;
  heroImageUrl?: string | null;
  heroOverlayEnabled?: boolean;
}): EmailBranding {
  const accentColor = parseEmailHexColor(
    input.emailAccentColor?.trim() ||
      accentFromWebsiteConfig(input.websiteConfig) ||
      DEFAULT_EMAIL_ACCENT,
  );

  const isDefault = accentColor === DEFAULT_EMAIL_ACCENT;
  const heroCard = Boolean(
    input.heroOverlayEnabled && emailSafeImageUrl(input.heroImageUrl),
  );
  const heroUrl = heroCard ? emailSafeImageUrl(input.heroImageUrl) : null;

  return {
    // Hero card already includes the logo; hide the separate header logo.
    logoUrl: heroCard ? null : emailSafeImageUrl(input.logoUrl),
    bannerUrl: heroUrl ?? emailSafeImageUrl(input.bannerUrl),
    accentColor,
    accentSoft: isDefault
      ? DEFAULT_EMAIL_ACCENT_SOFT
      : mixWithWhite(accentColor, 0.9, DEFAULT_EMAIL_ACCENT_SOFT),
    accentBorder: isDefault
      ? DEFAULT_EMAIL_ACCENT_BORDER
      : mixWithWhite(accentColor, 0.72, DEFAULT_EMAIL_ACCENT_BORDER),
    accentShadow: isDefault
      ? DEFAULT_EMAIL_ACCENT_SHADOW
      : `0 4px 12px ${accentColor}47`,
    heroCard,
  };
}
