/** Curated Google Font pairs for public event sites. */

export const EVENT_SITE_FONT_IDS = [
  "inter",
  "manrope",
  "dm-sans",
  "plus-jakarta",
  "space-grotesk",
  "playfair",
  "merriweather",
] as const;

export type EventSiteFontId = (typeof EVENT_SITE_FONT_IDS)[number];

export const EVENT_SITE_FONT_LABELS: Record<EventSiteFontId, string> = {
  inter: "Inter",
  manrope: "Manrope",
  "dm-sans": "DM Sans",
  "plus-jakarta": "Plus Jakarta Sans",
  "space-grotesk": "Space Grotesk",
  playfair: "Playfair Display",
  merriweather: "Merriweather",
};

/** CSS font-family stacks — variables loaded in public event layout. */
export const EVENT_SITE_FONT_CSS: Record<EventSiteFontId, string> = {
  inter: "var(--site-font-inter), system-ui, sans-serif",
  manrope: "var(--site-font-manrope), system-ui, sans-serif",
  "dm-sans": "var(--site-font-dm-sans), system-ui, sans-serif",
  "plus-jakarta": "var(--site-font-plus-jakarta), system-ui, sans-serif",
  "space-grotesk": "var(--site-font-space-grotesk), system-ui, sans-serif",
  playfair: "var(--site-font-playfair), Georgia, serif",
  merriweather: "var(--site-font-merriweather), Georgia, serif",
};

export function parseEventSiteFont(
  value: unknown,
  fallback: EventSiteFontId = "inter",
): EventSiteFontId {
  if (
    typeof value === "string" &&
    EVENT_SITE_FONT_IDS.includes(value as EventSiteFontId)
  ) {
    return value as EventSiteFontId;
  }
  return fallback;
}
