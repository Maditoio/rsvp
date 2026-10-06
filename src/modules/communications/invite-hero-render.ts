/**
 * Invite hero PNG composition — no server-only so Vitest can exercise rendering.
 * Callers that touch DB/blob remain in invite-hero.ts (server-only).
 */
import sharp, { type OverlayOptions } from "sharp";
import {
  type EmailHeroBackgroundMode,
  type EmailHeroGradientStyle,
  gradientPreset,
  parseEmailHeroBackgroundMode,
  parseEmailHeroGradientStyle,
} from "@/modules/communications/invite-hero-background";

const WIDTH = 1120;
const HEIGHT = 1480;

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function wrapLines(text: string, maxChars: number): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length <= maxChars) {
      current = next;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

async function fetchImageBuffer(url: string): Promise<Buffer | null> {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(20_000),
      headers: { Accept: "image/*,*/*" },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const type = (res.headers.get("content-type") ?? "").toLowerCase();
    // Allow missing type / octet-stream — Blob URLs sometimes omit image/*
    if (
      type &&
      !type.startsWith("image/") &&
      !type.includes("octet-stream") &&
      !type.includes("binary")
    ) {
      return null;
    }
    const buf = Buffer.from(await res.arrayBuffer());
    return buf.byteLength > 0 ? buf : null;
  } catch {
    return null;
  }
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const normalized = hex.replace("#", "");
  const full =
    normalized.length === 3
      ? normalized
          .split("")
          .map((c) => c + c)
          .join("")
      : normalized.padEnd(6, "0").slice(0, 6);
  return {
    r: Number.parseInt(full.slice(0, 2), 16) || 15,
    g: Number.parseInt(full.slice(2, 4), 16) || 23,
    b: Number.parseInt(full.slice(4, 6), 16) || 42,
  };
}

export type InviteHeroRenderInput = {
  /** Prefer this over fetching backgroundUrl when available (e.g. just-uploaded file). */
  backgroundBuffer?: Buffer | null;
  backgroundUrl?: string | null;
  backgroundMode?: EmailHeroBackgroundMode | null;
  gradientStyle?: EmailHeroGradientStyle | null;
  logoUrl?: string | null;
  accentColor: string;
  eyebrow?: string | null;
  title: string;
  detailLines?: string[];
  closing?: string | null;
};

export type InviteHeroRenderResult = {
  png: Buffer;
  /** True when a background photo was downloaded and used (not the solid accent fill). */
  usedBackgroundPhoto: boolean;
};

/**
 * Compose a portrait invitation hero: photo (or brand colour),
 * optional logo, and white overlay copy — one PNG for reliable email clients.
 */
export async function renderInviteHeroPng(
  input: InviteHeroRenderInput,
): Promise<InviteHeroRenderResult> {
  const accent = hexToRgb(input.accentColor);
  const mode = parseEmailHeroBackgroundMode(input.backgroundMode);
  const gradient = gradientPreset(parseEmailHeroGradientStyle(input.gradientStyle));

  let usedBackgroundPhoto = false;
  let base: Buffer;

  if (mode === "GRADIENT") {
    base = await sharp(
      Buffer.from(
        `<svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="bg" x1="0" y1="0" x2="0.2" y2="1">
              <stop offset="0%" stop-color="${gradient.top}"/>
              <stop offset="100%" stop-color="${gradient.bottom}"/>
            </linearGradient>
          </defs>
          <rect width="100%" height="100%" fill="url(#bg)"/>
        </svg>`,
      ),
    )
      .png()
      .toBuffer();
  } else if (mode === "COLOR") {
    base = await sharp({
      create: {
        width: WIDTH,
        height: HEIGHT,
        channels: 3,
        background: { r: accent.r, g: accent.g, b: accent.b },
      },
    })
      .png()
      .toBuffer();
  } else {
    let background = sharp({
      create: {
        width: WIDTH,
        height: HEIGHT,
        channels: 3,
        background: { r: accent.r, g: accent.g, b: accent.b },
      },
    }).png();

    const raw =
      input.backgroundBuffer && input.backgroundBuffer.byteLength > 0
        ? input.backgroundBuffer
        : input.backgroundUrl
          ? await fetchImageBuffer(input.backgroundUrl)
          : null;
    if (raw) {
      background = sharp(raw)
        .rotate()
        .resize(WIDTH, HEIGHT, { fit: "cover", position: "centre" })
        .blur(6)
        .modulate({ brightness: 0.78, saturation: 0.95 });
      usedBackgroundPhoto = true;
    }

    base = await background.png().toBuffer();
  }

  const composites: OverlayOptions[] = [
    {
      input: Buffer.from(
        `<svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="veil" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#000000" stop-opacity="0.18"/>
              <stop offset="40%" stop-color="#000000" stop-opacity="0.28"/>
              <stop offset="100%" stop-color="#000000" stop-opacity="0.55"/>
            </linearGradient>
          </defs>
          <rect width="100%" height="100%" fill="url(#veil)"/>
        </svg>`,
      ),
      top: 0,
      left: 0,
    },
  ];

  let textTop = 220;
  if (input.logoUrl) {
    const logoRaw = await fetchImageBuffer(input.logoUrl);
    if (logoRaw) {
      const logo = await sharp(logoRaw)
        .rotate()
        .resize({
          width: 280,
          height: 140,
          fit: "inside",
          withoutEnlargement: true,
        })
        .png()
        .toBuffer();
      const meta = await sharp(logo).metadata();
      const lw = meta.width ?? 280;
      const lh = meta.height ?? 140;
      composites.push({
        input: logo,
        top: 120,
        left: Math.round((WIDTH - lw) / 2),
      });
      textTop = 120 + lh + 48;
    }
  }

  const eyebrow = input.eyebrow?.trim() || "";
  const titleLines = wrapLines(input.title.trim() || "You're invited", 28);
  const detailLines = (input.detailLines ?? [])
    .flatMap((line) => wrapLines(line, 34))
    .slice(0, 8);
  const closing = input.closing?.trim() || "";

  let y = textTop;
  const tspans: string[] = [];
  if (eyebrow) {
    tspans.push(
      `<text x="560" y="${y}" text-anchor="middle" fill="#FFFFFF" fill-opacity="0.88" font-family="Inter, Helvetica, Arial, sans-serif" font-size="28">${escapeXml(eyebrow)}</text>`,
    );
    y += 56;
  }
  for (const line of titleLines) {
    tspans.push(
      `<text x="560" y="${y}" text-anchor="middle" fill="#FFFFFF" font-family="Inter, Helvetica, Arial, sans-serif" font-size="54" font-weight="700">${escapeXml(line)}</text>`,
    );
    y += 68;
  }
  if (detailLines.length > 0) {
    y += 28;
    tspans.push(
      `<line x1="360" y1="${y}" x2="760" y2="${y}" stroke="#FFFFFF" stroke-opacity="0.85" stroke-width="4"/>`,
    );
    y += 52;
    for (const line of detailLines) {
      tspans.push(
        `<text x="560" y="${y}" text-anchor="middle" fill="#FFFFFF" fill-opacity="0.92" font-family="Inter, Helvetica, Arial, sans-serif" font-size="30">${escapeXml(line)}</text>`,
      );
      y += 44;
    }
  }
  if (closing) {
    y += 36;
    tspans.push(
      `<text x="560" y="${y}" text-anchor="middle" fill="#FFFFFF" fill-opacity="0.88" font-family="Inter, Helvetica, Arial, sans-serif" font-size="28" font-style="italic">${escapeXml(closing)}</text>`,
    );
  }

  composites.push({
    input: Buffer.from(
      `<svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">${tspans.join("")}</svg>`,
    ),
    top: 0,
    left: 0,
  });

  const png = await sharp(base).composite(composites).png().toBuffer();
  return { png, usedBackgroundPhoto };
}
