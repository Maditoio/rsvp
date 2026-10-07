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
import { heroTextPath } from "@/modules/communications/invite-hero-fonts";

const WIDTH = 1120;
const HEIGHT = 1480;

/** Logo sits near the top — not centered with the copy stack. */
const LOGO_TOP = Math.round(HEIGHT * 0.09);
const LOGO_MAX_W = 280;
const LOGO_MAX_H = 140;
/** Minimum breathing room between logo and the first copy line. */
const LOGO_COPY_GAP = 72;
const BOTTOM_PAD = Math.round(HEIGHT * 0.1);

type CopyBlock =
  | { kind: "eyebrow"; text: string; height: number }
  | { kind: "title"; lines: string[]; height: number }
  | { kind: "rule"; height: number }
  | { kind: "details"; lines: string[]; height: number }
  | { kind: "closing"; text: string; height: number };

/**
 * Place copy blocks through the vertical band under the logo so the poster
 * reads top→middle→bottom instead of clustering under the logo.
 */
function layoutCopyBaselines(
  blocks: CopyBlock[],
  contentStart: number,
): number[] {
  if (blocks.length === 0) return [];

  const contentBottom = HEIGHT - BOTTOM_PAD;
  const intrinsic = blocks.reduce((sum, b) => sum + b.height, 0);
  const free = Math.max(0, contentBottom - contentStart - intrinsic);

  // Weight gaps: more air after the logo band and before closing.
  const gapWeights = blocks.map((_, i) => {
    if (i === 0) return 1.35; // space below logo / into title
    if (i === blocks.length - 1) return 1.15; // space before closing
    return 1;
  });
  // One trailing gap after the last block toward the bottom edge.
  const weights = [...gapWeights, 1.1];
  const weightSum = weights.reduce((a, b) => a + b, 0);

  const firstLineBaseline = (block: CopyBlock) => {
    switch (block.kind) {
      case "eyebrow":
        return 28;
      case "title":
        return 54;
      case "rule":
        return 0;
      case "details":
        return 30;
      case "closing":
        return 28;
    }
  };

  const baselines: number[] = [];
  let cursor = contentStart + (free * weights[0]!) / weightSum;
  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i]!;
    baselines.push(cursor + firstLineBaseline(block));
    cursor += block.height;
    const gapAfter = (free * weights[i + 1]!) / weightSum;
    cursor += gapAfter;
  }
  return baselines;
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

  let logoBottom = LOGO_TOP;
  if (input.logoUrl) {
    const logoRaw = await fetchImageBuffer(input.logoUrl);
    if (logoRaw) {
      const logo = await sharp(logoRaw)
        .rotate()
        .resize({
          width: LOGO_MAX_W,
          height: LOGO_MAX_H,
          fit: "inside",
          withoutEnlargement: true,
        })
        .png()
        .toBuffer();
      const meta = await sharp(logo).metadata();
      const lw = meta.width ?? LOGO_MAX_W;
      const lh = meta.height ?? LOGO_MAX_H;
      composites.push({
        input: logo,
        top: LOGO_TOP,
        left: Math.round((WIDTH - lw) / 2),
      });
      logoBottom = LOGO_TOP + lh;
    }
  }

  const eyebrow = input.eyebrow?.trim() || "";
  const titleLines = wrapLines(input.title.trim() || "You're invited", 28);
  const detailLines = (input.detailLines ?? [])
    .flatMap((line) => wrapLines(line, 34))
    .slice(0, 8);
  const closing = input.closing?.trim() || "";

  const blocks: CopyBlock[] = [];
  if (eyebrow) {
    blocks.push({ kind: "eyebrow", text: eyebrow, height: 40 });
  }
  if (titleLines.length > 0) {
    blocks.push({
      kind: "title",
      lines: titleLines,
      height: titleLines.length * 64,
    });
  }
  if (detailLines.length > 0) {
    blocks.push({ kind: "rule", height: 28 });
    blocks.push({
      kind: "details",
      lines: detailLines,
      height: detailLines.length * 42,
    });
  }
  if (closing) {
    blocks.push({ kind: "closing", text: closing, height: 40 });
  }

  // Copy starts below the logo (or upper band if no logo), then spreads downward.
  const contentStart = Math.max(
    Math.round(HEIGHT * 0.28),
    logoBottom + LOGO_COPY_GAP,
  );
  const baselines = layoutCopyBaselines(blocks, contentStart);

  const glyphs: string[] = [];
  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i]!;
    let y = baselines[i]!;

    if (block.kind === "eyebrow") {
      glyphs.push(
        heroTextPath({
          text: block.text,
          x: WIDTH / 2,
          y,
          fontSize: 28,
          fillOpacity: 0.88,
        }),
      );
    } else if (block.kind === "title") {
      for (const line of block.lines) {
        glyphs.push(
          heroTextPath({
            text: line,
            x: WIDTH / 2,
            y,
            fontSize: 54,
            style: "bold",
          }),
        );
        y += 64;
      }
    } else if (block.kind === "rule") {
      glyphs.push(
        `<line x1="360" y1="${y}" x2="760" y2="${y}" stroke="#FFFFFF" stroke-opacity="0.85" stroke-width="4"/>`,
      );
    } else if (block.kind === "details") {
      for (const line of block.lines) {
        glyphs.push(
          heroTextPath({
            text: line,
            x: WIDTH / 2,
            y,
            fontSize: 30,
            fillOpacity: 0.92,
          }),
        );
        y += 42;
      }
    } else if (block.kind === "closing") {
      glyphs.push(
        heroTextPath({
          text: block.text,
          x: WIDTH / 2,
          y,
          fontSize: 28,
          style: "italic",
          fillOpacity: 0.88,
        }),
      );
    }
  }

  composites.push({
    input: Buffer.from(
      `<svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">${glyphs.join("")}</svg>`,
    ),
    top: 0,
    left: 0,
  });

  const png = await sharp(base).composite(composites).png().toBuffer();
  return { png, usedBackgroundPhoto };
}
