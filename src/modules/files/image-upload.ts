/** Shared limits for event image uploads (logos, badge backgrounds). */

export const MAX_EVENT_IMAGE_BYTES = 2 * 1024 * 1024;

/** Compress rasters toward this so uploads stay under the Server Action body limit. */
export const TARGET_UPLOAD_BYTES = Math.floor(1.5 * 1024 * 1024);

export const MAX_BACKGROUND_DIMENSION = 2400;
export const MAX_LOGO_DIMENSION = 1600;

export const ALLOWED_EVENT_IMAGE_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/svg+xml",
]);

/** Browser / OS aliases we normalize before reject. */
const MIME_ALIASES: Record<string, string> = {
  "image/jpg": "image/jpeg",
  "image/pjpeg": "image/jpeg",
  "image/x-png": "image/png",
};

export type EventImageKind = "background" | "logo";

export function formatFileBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function eventImageTypeError(details?: {
  reportedType?: string;
  fileName?: string;
  sizeBytes?: number;
}): string {
  const hasReported = details && "reportedType" in details;
  const reportedRaw = details?.reportedType?.trim() ?? "";
  const reportedLabel = hasReported
    ? `browser type "${reportedRaw || "(empty)"}"`
    : null;
  const name = details?.fileName?.trim();
  const size =
    typeof details?.sizeBytes === "number"
      ? formatFileBytes(details.sizeBytes)
      : null;
  const parts = [
    reportedLabel,
    name ? `file "${name}"` : null,
    size ? size : null,
  ].filter(Boolean);
  if (parts.length === 0) {
    return "Use PNG, JPEG, WebP, or SVG.";
  }
  return `This file isn't an accepted image type (${parts.join(", ")}). Use PNG, JPEG, WebP, or SVG.`;
}

export function eventImageTooLargeMessage(
  kind: EventImageKind = "logo",
  sizeBytes?: number,
): string {
  const sizePart =
    typeof sizeBytes === "number"
      ? ` (${formatFileBytes(sizeBytes)}; max 2 MB)`
      : " (max 2 MB)";
  if (kind === "background") {
    return `This background image is too large${sizePart}. Try a smaller photo, or export as JPEG or WebP at a lower resolution.`;
  }
  return `This image is too large${sizePart}. Try a smaller file, or export as JPEG or WebP at a lower resolution.`;
}

export function isServerActionBodyTooLarge(error: unknown): boolean {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "";
  return /body exceeded|body size limit|bodysizelimit/i.test(message);
}

export function friendlyUploadFailure(
  error: unknown,
  kind: EventImageKind,
  fallback: string,
): string {
  if (isServerActionBodyTooLarge(error)) {
    return eventImageTooLargeMessage(kind);
  }
  if (error instanceof Error && error.message && error.message.length < 400) {
    const message = error.message.trim();
    if (message && !message.includes("digest")) return message;
  }
  if (typeof error === "string" && error.trim() && error.length < 400) {
    return error.trim();
  }
  return fallback;
}

/**
 * Resolve a usable MIME type from the browser-reported type and/or file bytes.
 * Returns null when the file is not an allowed image.
 */
export async function resolveEventImageMime(
  file: Blob & { name?: string; type: string },
): Promise<string | null> {
  const reported = (file.type || "").trim().toLowerCase();
  const aliased = MIME_ALIASES[reported] ?? reported;
  if (ALLOWED_EVENT_IMAGE_TYPES.has(aliased)) {
    return aliased;
  }

  const sniffed = await sniffImageMime(file);
  if (sniffed && ALLOWED_EVENT_IMAGE_TYPES.has(sniffed)) {
    return sniffed;
  }
  return null;
}

export async function sniffImageMime(file: Blob): Promise<string | null> {
  const header = new Uint8Array(await file.slice(0, 64).arrayBuffer());
  if (header.length >= 8) {
    // PNG
    if (
      header[0] === 0x89 &&
      header[1] === 0x50 &&
      header[2] === 0x4e &&
      header[3] === 0x47
    ) {
      return "image/png";
    }
    // JPEG
    if (header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff) {
      return "image/jpeg";
    }
    // WEBP: RIFF....WEBP
    if (
      header[0] === 0x52 &&
      header[1] === 0x49 &&
      header[2] === 0x46 &&
      header[3] === 0x46 &&
      header[8] === 0x57 &&
      header[9] === 0x45 &&
      header[10] === 0x42 &&
      header[11] === 0x50
    ) {
      return "image/webp";
    }
  }

  const text = new TextDecoder("utf-8", { fatal: false })
    .decode(header)
    .replace(/^\uFEFF/, "")
    .trimStart()
    .toLowerCase();
  if (text.startsWith("<svg") || text.startsWith("<?xml")) {
    // Confirm SVG-ish; avoid treating random XML as SVG without <svg nearby.
    if (text.includes("<svg") || /<\?xml[\s\S]*<svg/.test(text)) {
      return "image/svg+xml";
    }
  }
  return null;
}
