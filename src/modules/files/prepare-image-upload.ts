import {
  ALLOWED_EVENT_IMAGE_TYPES,
  MAX_BACKGROUND_DIMENSION,
  MAX_EVENT_IMAGE_BYTES,
  MAX_LOGO_DIMENSION,
  TARGET_UPLOAD_BYTES,
  eventImageTooLargeMessage,
  eventImageTypeError,
  type EventImageKind,
} from "@/modules/files/image-upload";

export type PrepareImageResult =
  | { ok: true; file: File }
  | { ok: false; error: string };

/**
 * Validate and, for large rasters, resize/compress in the browser before a
 * Server Action upload so typical phone photos work without hitting Next's
 * body size limit.
 */
export async function prepareImageForUpload(
  file: File,
  kind: EventImageKind = "logo",
): Promise<PrepareImageResult> {
  if (!ALLOWED_EVENT_IMAGE_TYPES.has(file.type)) {
    return { ok: false, error: eventImageTypeError() };
  }

  if (file.type === "image/svg+xml") {
    if (file.size > MAX_EVENT_IMAGE_BYTES) {
      return { ok: false, error: eventImageTooLargeMessage(kind) };
    }
    return { ok: true, file };
  }

  if (file.size <= TARGET_UPLOAD_BYTES) {
    return { ok: true, file };
  }

  try {
    const compressed = await compressRasterImage(file, {
      maxDimension:
        kind === "background" ? MAX_BACKGROUND_DIMENSION : MAX_LOGO_DIMENSION,
      maxBytes: TARGET_UPLOAD_BYTES,
    });
    if (compressed.size > MAX_EVENT_IMAGE_BYTES) {
      return { ok: false, error: eventImageTooLargeMessage(kind) };
    }
    return { ok: true, file: compressed };
  } catch {
    if (file.size > MAX_EVENT_IMAGE_BYTES) {
      return { ok: false, error: eventImageTooLargeMessage(kind) };
    }
    return { ok: true, file };
  }
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality?: number,
): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), type, quality);
  });
}

async function compressRasterImage(
  file: File,
  opts: { maxDimension: number; maxBytes: number },
): Promise<File> {
  const bitmap = await createImageBitmap(file);
  try {
    let width = bitmap.width;
    let height = bitmap.height;
    const scale = Math.min(
      1,
      opts.maxDimension / Math.max(width, height, 1),
    );
    width = Math.max(1, Math.round(width * scale));
    height = Math.max(1, Math.round(height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas unavailable");
    ctx.drawImage(bitmap, 0, 0, width, height);

    // WebP keeps alpha (important for logos); fall back to source-friendly types.
    const mimeTypes: string[] =
      file.type === "image/png"
        ? ["image/webp", "image/png"]
        : ["image/webp", "image/jpeg"];

    let best: { blob: Blob; type: string } | null = null;

    for (const type of mimeTypes) {
      const qualities =
        type === "image/png" ? [undefined] : [0.85, 0.75, 0.65, 0.55];
      for (const quality of qualities) {
        const blob = await canvasToBlob(canvas, type, quality);
        if (!blob || blob.size === 0) continue;
        if (!best || blob.size < best.blob.size) {
          best = { blob, type };
        }
        if (blob.size <= opts.maxBytes) {
          return blobToFile(blob, file.name, type);
        }
      }
    }

    // Still too large — shrink dimensions and try again.
    for (const factor of [0.75, 0.55, 0.4]) {
      const w = Math.max(1, Math.round(width * factor));
      const h = Math.max(1, Math.round(height * factor));
      canvas.width = w;
      canvas.height = h;
      ctx.drawImage(bitmap, 0, 0, w, h);
      for (const type of mimeTypes) {
        const quality = type === "image/png" ? undefined : 0.7;
        const blob = await canvasToBlob(canvas, type, quality);
        if (!blob || blob.size === 0) continue;
        if (!best || blob.size < best.blob.size) {
          best = { blob, type };
        }
        if (blob.size <= opts.maxBytes) {
          return blobToFile(blob, file.name, type);
        }
      }
    }

    if (!best) throw new Error("Could not compress image");
    return blobToFile(best.blob, file.name, best.type);
  } finally {
    bitmap.close();
  }
}

function blobToFile(blob: Blob, originalName: string, type: string): File {
  const ext =
    type === "image/webp" ? "webp" : type === "image/png" ? "png" : "jpg";
  const base = originalName.replace(/\.[^.]+$/, "") || "image";
  return new File([blob], `${base}.${ext}`, {
    type,
    lastModified: Date.now(),
  });
}
