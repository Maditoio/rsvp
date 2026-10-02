import {
  ALLOWED_EVENT_IMAGE_TYPES,
  MAX_BACKGROUND_DIMENSION,
  MAX_EVENT_IMAGE_BYTES,
  MAX_LOGO_DIMENSION,
  TARGET_UPLOAD_BYTES,
  eventImageTooLargeMessage,
  eventImageTypeError,
  formatFileBytes,
  resolveEventImageMime,
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
  const mime = await resolveEventImageMime(file);
  if (!mime) {
    return {
      ok: false,
      error: eventImageTypeError({
        reportedType: file.type || "(empty)",
        fileName: file.name,
        sizeBytes: file.size,
      }),
    };
  }

  const normalized =
    mime === file.type
      ? file
      : new File([file], file.name || defaultNameForMime(mime), {
          type: mime,
          lastModified: file.lastModified,
        });

  if (normalized.type === "image/svg+xml") {
    if (normalized.size > MAX_EVENT_IMAGE_BYTES) {
      return {
        ok: false,
        error: eventImageTooLargeMessage(kind, normalized.size),
      };
    }
    return { ok: true, file: normalized };
  }

  if (normalized.size <= TARGET_UPLOAD_BYTES) {
    return { ok: true, file: normalized };
  }

  try {
    const compressed = await compressRasterImage(normalized, {
      maxDimension:
        kind === "background" ? MAX_BACKGROUND_DIMENSION : MAX_LOGO_DIMENSION,
      maxBytes: TARGET_UPLOAD_BYTES,
    });
    if (compressed.size > MAX_EVENT_IMAGE_BYTES) {
      return {
        ok: false,
        error: eventImageTooLargeMessage(kind, compressed.size),
      };
    }
    return { ok: true, file: compressed };
  } catch (error) {
    const detail =
      error instanceof Error && error.message
        ? error.message
        : "browser could not decode this image";
    if (normalized.size > MAX_EVENT_IMAGE_BYTES) {
      return {
        ok: false,
        error: `${eventImageTooLargeMessage(kind, normalized.size)} Decode also failed: ${detail}.`,
      };
    }
    // Small enough to send raw — try uploading original despite decode failure.
    if (ALLOWED_EVENT_IMAGE_TYPES.has(normalized.type)) {
      return { ok: true, file: normalized };
    }
    return {
      ok: false,
      error: `Could not process this image (${detail}). File: "${normalized.name}", ${formatFileBytes(normalized.size)}, type "${normalized.type}". Try re-exporting as PNG or JPEG.`,
    };
  }
}

function defaultNameForMime(mime: string): string {
  if (mime === "image/png") return "image.png";
  if (mime === "image/webp") return "image.webp";
  if (mime === "image/svg+xml") return "image.svg";
  return "image.jpg";
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
