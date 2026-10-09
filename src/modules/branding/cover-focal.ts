/** Warn when source photo is narrower than this (heroes look soft in email). */
export const PHOTO_MIN_RECOMMENDED_WIDTH = 1200;

/**
 * Cover-crop offsets from a focal point (0–100%) and optional zoom (100–200%).
 * Used by sharp hero compose so organisers can shift and zoom which part of a photo is kept.
 */
export function coverCropFromFocal(input: {
  srcWidth: number;
  srcHeight: number;
  outWidth: number;
  outHeight: number;
  focalX: number;
  focalY: number;
  /** Zoom percent; 100 = standard cover, 200 = 2× zoom into the focal area. */
  zoom?: number;
}): { width: number; height: number; left: number; top: number } {
  const { srcWidth, srcHeight, outWidth, outHeight } = input;
  const fx = Math.min(100, Math.max(0, input.focalX)) / 100;
  const fy = Math.min(100, Math.max(0, input.focalY)) / 100;
  const zoom = Math.min(200, Math.max(100, input.zoom ?? 100)) / 100;

  const scale = Math.max(outWidth / srcWidth, outHeight / srcHeight) * zoom;
  const scaledW = srcWidth * scale;
  const scaledH = srcHeight * scale;
  const maxX = Math.max(0, scaledW - outWidth);
  const maxY = Math.max(0, scaledH - outHeight);

  return {
    width: Math.round(scaledW),
    height: Math.round(scaledH),
    left: Math.round(maxX * fx),
    top: Math.round(maxY * fy),
  };
}

/** Clamp photo zoom percent (100–200). */
export function parsePhotoZoom(value: unknown, fallback = 100): number {
  const n =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number.parseInt(value, 10)
        : Number.NaN;
  if (!Number.isFinite(n)) return fallback;
  return Math.min(200, Math.max(100, Math.round(n)));
}
