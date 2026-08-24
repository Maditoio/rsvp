/**
 * Client-side QR camera helpers.
 * Prefer native BarcodeDetector (Chrome/Android); fall back to jsQR for Safari/Edge/Firefox.
 */

import jsQR from "jsqr";

type BarcodeDetectorLike = {
  detect: (source: ImageBitmapSource) => Promise<Array<{ rawValue: string }>>;
};

let nativeDetector: BarcodeDetectorLike | null | undefined;
let canvas: HTMLCanvasElement | null = null;
let canvasCtx: CanvasRenderingContext2D | null = null;

function getNativeDetector(): BarcodeDetectorLike | null {
  if (nativeDetector !== undefined) return nativeDetector;
  const Ctor = (
    globalThis as unknown as {
      BarcodeDetector?: new (opts: { formats: string[] }) => BarcodeDetectorLike;
    }
  ).BarcodeDetector;
  if (!Ctor) {
    nativeDetector = null;
    return null;
  }
  try {
    nativeDetector = new Ctor({ formats: ["qr_code"] });
  } catch {
    nativeDetector = null;
  }
  return nativeDetector;
}

function getCanvasContext(): CanvasRenderingContext2D | null {
  if (!canvas) {
    canvas = document.createElement("canvas");
  }
  if (!canvasCtx) {
    canvasCtx = canvas.getContext("2d", { willReadFrequently: true });
  }
  return canvasCtx;
}

/** True when the browser can open a camera stream (HTTPS / localhost required). */
export function isQrCameraAvailable(): boolean {
  return (
    typeof navigator !== "undefined" &&
    Boolean(navigator.mediaDevices?.getUserMedia) &&
    (typeof window === "undefined" || window.isSecureContext !== false)
  );
}

/**
 * Open the rear camera when possible; fall back to any camera (desktop / Safari).
 */
export async function openQrCameraStream(): Promise<MediaStream> {
  try {
    return await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: {
        facingMode: { ideal: "environment" },
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
    });
  } catch {
    return navigator.mediaDevices.getUserMedia({
      audio: false,
      video: true,
    });
  }
}

async function detectWithJsQr(video: HTMLVideoElement): Promise<string | null> {
  const width = video.videoWidth;
  const height = video.videoHeight;
  if (!width || !height) return null;

  const ctx = getCanvasContext();
  if (!ctx || !canvas) return null;

  // Cap decode size for Safari performance while keeping QR readable.
  const maxEdge = 720;
  const scale = Math.min(1, maxEdge / Math.max(width, height));
  const w = Math.max(1, Math.floor(width * scale));
  const h = Math.max(1, Math.floor(height * scale));
  canvas.width = w;
  canvas.height = h;
  ctx.drawImage(video, 0, 0, w, h);
  const imageData = ctx.getImageData(0, 0, w, h);
  const code = jsQR(imageData.data, imageData.width, imageData.height, {
    inversionAttempts: "dontInvert",
  });
  return code?.data?.trim() || null;
}

/** Read one QR payload from the current video frame, or null if none. */
export async function detectQrFromVideo(
  video: HTMLVideoElement,
): Promise<string | null> {
  if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) return null;

  const detector = getNativeDetector();
  if (detector) {
    try {
      const codes = await detector.detect(video);
      const raw = codes[0]?.rawValue?.trim();
      if (raw) return raw;
    } catch {
      // Fall through to jsQR (some desktop Chromium builds throw).
    }
  }

  try {
    return await detectWithJsQr(video);
  } catch {
    return null;
  }
}
