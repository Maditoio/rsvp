/**
 * Invite hero PNG composition — no server-only so Vitest can exercise rendering.
 * Callers that touch DB/blob remain in invite-hero.ts (server-only).
 */
import sharp, { type OverlayOptions } from "sharp";
import {
  type BrandHeadingAlign,
  type BrandHeadingFont,
  type BrandHeadingLineHeight,
  type BrandHeadingSize,
  type BrandHeadingTracking,
  type BrandHeadingWeight,
  brandHeadingHeroTrackingEm,
  defaultHeadingColor,
  heroTypeScale,
  heroWeightStyle,
  parseBrandHeadingAlign,
  parseBrandHeadingColor,
  parseBrandHeadingEyebrowUppercase,
  parseBrandHeadingFont,
  parseBrandHeadingLineHeight,
  parseBrandHeadingSize,
  parseBrandHeadingTracking,
  parseBrandHeadingWeight,
  parseFocalPercent,
} from "@/modules/branding/brand-heading-style";
import {
  coverCropFromFocal,
  parsePhotoZoom,
} from "@/modules/branding/cover-focal";
import { heroOverlayStops } from "@/modules/branding/heading-contrast";
import {
  type EmailHeroBackgroundMode,
  type EmailHeroGradientStyle,
  gradientPreset,
  parseEmailHeroBackgroundMode,
  parseEmailHeroGradientStyle,
  parseHeroBlur,
  parseHeroOverlay,
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
const TEXT_LEFT = 120;
const TEXT_CENTER = Math.round(WIDTH / 2);
const RULE_WIDTH = 400;

type CopyBlock =
  | { kind: "eyebrow"; text: string; height: number }
  | { kind: "title"; lines: string[]; height: number }
  | { kind: "rule"; height: number }
  | { kind: "details"; lines: string[]; height: number }
  | { kind: "closing"; lines: string[]; height: number };

/**
 * Place copy blocks through the vertical band under the logo so the poster
 * reads top→middle→bottom instead of clustering under the logo.
 */
function layoutCopyBaselines(
  blocks: CopyBlock[],
  contentStart: number,
  scale: ReturnType<typeof heroTypeScale>,
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
        return scale.eyebrow;
      case "title":
        return scale.title;
      case "rule":
        return 0;
      case "details":
        return scale.detail;
      case "closing":
        return scale.closing;
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
  /** Sharp blur sigma when mode is IMAGE (0 = sharp photo). */
  blur?: number | null;
  /** Dark veil strength 0–100 (bottom stop opacity). */
  overlay?: number | null;
  /** Photo focal point 0–100 (which part of the image stays in frame). */
  focalX?: number | null;
  focalY?: number | null;
  /** Photo zoom percent 100–200. */
  zoom?: number | null;
  logoUrl?: string | null;
  accentColor: string;
  eyebrow?: string | null;
  title: string;
  detailLines?: string[];
  closing?: string | null;
  headingColor?: string | null;
  headingFont?: BrandHeadingFont | string | null;
  headingSize?: BrandHeadingSize | string | null;
  headingWeight?: BrandHeadingWeight | string | null;
  headingTracking?: BrandHeadingTracking | string | null;
  headingAlign?: BrandHeadingAlign | string | null;
  headingLineHeight?: BrandHeadingLineHeight | string | null;
  headingEyebrowUppercase?: boolean | string | null;
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
  const headingFont = parseBrandHeadingFont(input.headingFont);
  const headingSize = parseBrandHeadingSize(input.headingSize);
  const headingWeight = parseBrandHeadingWeight(input.headingWeight);
  const headingTracking = parseBrandHeadingTracking(input.headingTracking);
  const headingAlign = parseBrandHeadingAlign(input.headingAlign);
  const headingLineHeight = parseBrandHeadingLineHeight(input.headingLineHeight);
  const eyebrowUppercase = parseBrandHeadingEyebrowUppercase(
    input.headingEyebrowUppercase ?? true,
  );
  const typeScale = heroTypeScale(headingSize, headingLineHeight);
  const titleStyle = heroWeightStyle(headingWeight);
  const trackingEm = brandHeadingHeroTrackingEm(headingTracking);
  const textX = headingAlign === "left" ? TEXT_LEFT : TEXT_CENTER;
  const overlayStops = heroOverlayStops(
    parseHeroOverlay(input.overlay, 55),
  );
  const textFill =
    parseBrandHeadingColor(input.headingColor) ?? defaultHeadingColor(true);
  const focalX = parseFocalPercent(input.focalX, 50);
  const focalY = parseFocalPercent(input.focalY, 50);
  const zoom = parsePhotoZoom(input.zoom, 100);

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
      const blur = parseHeroBlur(input.blur, 6);
      const rotated = sharp(raw).rotate();
      const meta = await rotated.metadata();
      const srcW = meta.width ?? WIDTH;
      const srcH = meta.height ?? HEIGHT;
      const crop = coverCropFromFocal({
        srcWidth: srcW,
        srcHeight: srcH,
        outWidth: WIDTH,
        outHeight: HEIGHT,
        focalX,
        focalY,
        zoom,
      });
      let photo = rotated
        .resize(crop.width, crop.height)
        .extract({
          left: crop.left,
          top: crop.top,
          width: WIDTH,
          height: HEIGHT,
        });
      if (blur > 0) {
        photo = photo.blur(blur);
      }
      background = photo.modulate({ brightness: 0.78, saturation: 0.95 });
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
              <stop offset="0%" stop-color="#000000" stop-opacity="${overlayStops.top.toFixed(3)}"/>
              <stop offset="40%" stop-color="#000000" stop-opacity="${overlayStops.mid.toFixed(3)}"/>
              <stop offset="100%" stop-color="#000000" stop-opacity="${overlayStops.bottom.toFixed(3)}"/>
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

  const eyebrowRaw = input.eyebrow?.trim() || "";
  const eyebrow = eyebrowUppercase ? eyebrowRaw.toUpperCase() : eyebrowRaw;
  const titleLines = wrapLines(
    input.title.trim() || "You're invited",
    typeScale.wrapTitle,
  );
  const detailLines = (input.detailLines ?? [])
    .flatMap((line) => wrapLines(line, typeScale.wrapDetail))
    .slice(0, 8);
  const closingLines = wrapLines(
    input.closing?.trim() || "",
    typeScale.wrapDetail,
  );

  const blocks: CopyBlock[] = [];
  if (eyebrow) {
    blocks.push({
      kind: "eyebrow",
      text: eyebrow,
      height: Math.round(typeScale.eyebrow * 1.4),
    });
  }
  if (titleLines.length > 0) {
    blocks.push({
      kind: "title",
      lines: titleLines,
      height: titleLines.length * typeScale.titleLine,
    });
  }
  if (detailLines.length > 0) {
    blocks.push({ kind: "rule", height: 28 });
    blocks.push({
      kind: "details",
      lines: detailLines,
      height: detailLines.length * typeScale.detailLine,
    });
  }
  if (closingLines.length > 0) {
    const closingLine = Math.round(typeScale.closing * 1.35);
    blocks.push({
      kind: "closing",
      lines: closingLines,
      height: closingLines.length * closingLine,
    });
  }

  // Copy starts below the logo (or upper band if no logo), then spreads downward.
  const contentStart = Math.max(
    Math.round(HEIGHT * 0.28),
    logoBottom + LOGO_COPY_GAP,
  );
  const baselines = layoutCopyBaselines(blocks, contentStart, typeScale);

  const glyphs: string[] = [];
  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i]!;
    let y = baselines[i]!;

    if (block.kind === "eyebrow") {
      glyphs.push(
        heroTextPath({
          text: block.text,
          x: textX,
          y,
          fontSize: typeScale.eyebrow,
          fill: textFill,
          fillOpacity: 0.88,
          fontFamily: headingFont,
          trackingEm,
          align: headingAlign,
        }),
      );
    } else if (block.kind === "title") {
      for (const line of block.lines) {
        glyphs.push(
          heroTextPath({
            text: line,
            x: textX,
            y,
            fontSize: typeScale.title,
            style: titleStyle,
            fill: textFill,
            fontFamily: headingFont,
            trackingEm,
            align: headingAlign,
          }),
        );
        y += typeScale.titleLine;
      }
    } else if (block.kind === "rule") {
      const x1 =
        headingAlign === "left" ? TEXT_LEFT : TEXT_CENTER - RULE_WIDTH / 2;
      const x2 = x1 + RULE_WIDTH;
      glyphs.push(
        `<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="${textFill}" stroke-opacity="0.85" stroke-width="4"/>`,
      );
    } else if (block.kind === "details") {
      for (const line of block.lines) {
        glyphs.push(
          heroTextPath({
            text: line,
            x: textX,
            y,
            fontSize: typeScale.detail,
            fill: textFill,
            fillOpacity: 0.92,
            fontFamily: headingFont,
            trackingEm,
            align: headingAlign,
          }),
        );
        y += typeScale.detailLine;
      }
    } else if (block.kind === "closing") {
      const closingLine = Math.round(typeScale.closing * 1.35);
      for (const line of block.lines) {
        glyphs.push(
          heroTextPath({
            text: line,
            x: textX,
            y,
            fontSize: typeScale.closing,
            style: "italic",
            fill: textFill,
            fillOpacity: 0.88,
            fontFamily: headingFont,
            trackingEm,
            align: headingAlign,
          }),
        );
        y += closingLine;
      }
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
