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

export type EventImageKind = "background" | "logo";

export function eventImageTypeError(): string {
  return "Use PNG, JPEG, WebP, or SVG.";
}

export function eventImageTooLargeMessage(kind: EventImageKind = "logo"): string {
  if (kind === "background") {
    return "This background image is too large (max 2 MB). Try a smaller photo, or export as JPEG or WebP at a lower resolution.";
  }
  return "This image is too large (max 2 MB). Try a smaller file, or export as JPEG or WebP at a lower resolution.";
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
  if (error instanceof Error && error.message && error.message.length < 220) {
    const message = error.message.trim();
    if (message && !message.includes("digest")) return message;
  }
  return fallback;
}
