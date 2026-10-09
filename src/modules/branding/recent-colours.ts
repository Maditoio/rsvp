/** Persist recently picked custom brand colours (per browser). */

const STORAGE_KEY = "delegate:branding:recent-colours";
const MAX_RECENT = 6;

function normalizeHex(value: string): string | null {
  const trimmed = value.trim().toUpperCase();
  if (/^#[0-9A-F]{6}$/.test(trimmed)) return trimmed;
  if (/^#[0-9A-F]{3}$/.test(trimmed)) {
    return `#${trimmed[1]}${trimmed[1]}${trimmed[2]}${trimmed[2]}${trimmed[3]}${trimmed[3]}`;
  }
  return null;
}

export function readRecentColours(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    const out: string[] = [];
    const seen = new Set<string>();
    for (const item of parsed) {
      if (typeof item !== "string") continue;
      const hex = normalizeHex(item);
      if (!hex || seen.has(hex)) continue;
      seen.add(hex);
      out.push(hex);
      if (out.length >= MAX_RECENT) break;
    }
    return out;
  } catch {
    return [];
  }
}

export function rememberRecentColour(value: string): string[] {
  const hex = normalizeHex(value);
  if (!hex || typeof window === "undefined") return readRecentColours();
  const next = [hex, ...readRecentColours().filter((c) => c !== hex)].slice(
    0,
    MAX_RECENT,
  );
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // ignore quota / private mode
  }
  return next;
}
