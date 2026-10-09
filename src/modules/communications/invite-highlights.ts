/**
 * Invitation email body bullets — one insight per line.
 * Separate from emailHeroDetail (hero PNG copy).
 */

export const INVITE_HIGHLIGHT_MAX_LINES = 8;
export const INVITE_HIGHLIGHT_MAX_LINE_CHARS = 120;
export const INVITE_HIGHLIGHT_MAX_RAW = 1000;

/** Split raw textarea into trimmed, length-capped bullet lines. */
export function parseInviteHighlights(value: unknown): string[] {
  if (typeof value !== "string") return [];
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.slice(0, INVITE_HIGHLIGHT_MAX_LINE_CHARS))
    .slice(0, INVITE_HIGHLIGHT_MAX_LINES);
}

/** Normalise for storage; empty → null. */
export function formatInviteHighlights(value: unknown): string | null {
  const lines = parseInviteHighlights(value);
  if (lines.length === 0) return null;
  return lines.join("\n");
}
