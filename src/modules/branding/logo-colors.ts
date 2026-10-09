/** Client-side palette extraction from a logo image URL. */

function rgbToHex(r: number, g: number, b: number): string {
  const to = (n: number) =>
    Math.min(255, Math.max(0, Math.round(n)))
      .toString(16)
      .padStart(2, "0")
      .toUpperCase();
  return `#${to(r)}${to(g)}${to(b)}`;
}

function isNearWhite(r: number, g: number, b: number): boolean {
  return r > 245 && g > 245 && b > 245;
}

function isNearBlack(r: number, g: number, b: number): boolean {
  return r < 18 && g < 18 && b < 18;
}

function isGrayish(r: number, g: number, b: number): boolean {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  return max - min < 18;
}

/**
 * Quantize and rank colours from a logo. Returns up to `max` distinct hex
 * colours suitable as brand accent suggestions. Empty if the image cannot load.
 */
export async function extractLogoColors(
  imageUrl: string,
  max = 5,
): Promise<string[]> {
  if (typeof window === "undefined" || !imageUrl) return [];

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const size = 48;
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) {
          resolve([]);
          return;
        }
        ctx.drawImage(img, 0, 0, size, size);
        const { data } = ctx.getImageData(0, 0, size, size);
        const counts = new Map<string, number>();

        for (let i = 0; i < data.length; i += 4) {
          const a = data[i + 3]!;
          if (a < 128) continue;
          // Quantize to 16-step buckets to cluster similar pixels.
          const r = (data[i]! >> 4) << 4;
          const g = (data[i + 1]! >> 4) << 4;
          const b = (data[i + 2]! >> 4) << 4;
          if (isNearWhite(r, g, b) || isNearBlack(r, g, b)) continue;
          if (isGrayish(r, g, b) && r > 200) continue;
          const hex = rgbToHex(r + 8, g + 8, b + 8);
          counts.set(hex, (counts.get(hex) ?? 0) + 1);
        }

        const ranked = [...counts.entries()]
          .sort((a, b) => b[1] - a[1])
          .map(([hex]) => hex)
          .slice(0, max);

        resolve(ranked);
      } catch {
        resolve([]);
      }
    };
    img.onerror = () => resolve([]);
    img.src = imageUrl;
  });
}
