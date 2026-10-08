/**
 * Cover-crop offsets from a focal point (0–100%).
 * Used by sharp hero compose so organisers can shift which part of a photo is kept.
 */
export function coverCropFromFocal(input: {
  srcWidth: number;
  srcHeight: number;
  outWidth: number;
  outHeight: number;
  focalX: number;
  focalY: number;
}): { width: number; height: number; left: number; top: number } {
  const { srcWidth, srcHeight, outWidth, outHeight } = input;
  const fx = Math.min(100, Math.max(0, input.focalX)) / 100;
  const fy = Math.min(100, Math.max(0, input.focalY)) / 100;

  const scale = Math.max(outWidth / srcWidth, outHeight / srcHeight);
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
