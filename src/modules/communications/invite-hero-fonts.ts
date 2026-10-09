import { readFileSync } from "node:fs";
import { join } from "node:path";
// opentype.js ESM build exposes named exports only (no default) — required for Turbopack.
import { parse as parseOpenTypeFont, type Font } from "opentype.js";
import {
  normalizeBrandHeadingFont,
  type BrandHeadingFont,
} from "@/modules/branding/brand-heading-style";

type HeroFontSet = {
  regular: Font;
  medium: Font;
  semibold: Font;
  bold: Font;
  italic: Font;
};

const cache = new Map<string, HeroFontSet>();

function loadFont(filename: string): Font {
  const path = join(process.cwd(), "assets/fonts/invite-hero", filename);
  const buffer = readFileSync(path);
  return parseOpenTypeFont(
    buffer.buffer.slice(
      buffer.byteOffset,
      buffer.byteOffset + buffer.byteLength,
    ),
  );
}

function family(
  regular: string,
  medium: string,
  semibold: string,
  bold: string,
  italic?: string,
): HeroFontSet {
  const reg = loadFont(regular);
  return {
    regular: reg,
    medium: loadFont(medium),
    semibold: loadFont(semibold),
    bold: loadFont(bold),
    italic: italic ? loadFont(italic) : reg,
  };
}

function fontsFor(familyId: BrandHeadingFont): HeroFontSet {
  const id = normalizeBrandHeadingFont(familyId);
  const hit = cache.get(id);
  if (hit) return hit;

  let set: HeroFontSet;
  switch (id) {
    case "source-serif":
      set = family(
        "SourceSerif4-Regular.ttf",
        "SourceSerif4-Medium.ttf",
        "SourceSerif4-SemiBold.ttf",
        "SourceSerif4-Bold.ttf",
      );
      break;
    case "dm-sans":
      set = family(
        "DMSans-Regular.ttf",
        "DMSans-Medium.ttf",
        "DMSans-SemiBold.ttf",
        "DMSans-Bold.ttf",
      );
      break;
    case "manrope":
      set = family(
        "Manrope-Regular.ttf",
        "Manrope-Medium.ttf",
        "Manrope-SemiBold.ttf",
        "Manrope-Bold.ttf",
      );
      break;
    case "jakarta":
      set = family(
        "PlusJakartaSans-Regular.ttf",
        "PlusJakartaSans-Medium.ttf",
        "PlusJakartaSans-SemiBold.ttf",
        "PlusJakartaSans-Bold.ttf",
      );
      break;
    case "space-grotesk":
      set = family(
        "SpaceGrotesk-Regular.ttf",
        "SpaceGrotesk-Medium.ttf",
        "SpaceGrotesk-SemiBold.ttf",
        "SpaceGrotesk-Bold.ttf",
      );
      break;
    case "playfair":
      set = family(
        "PlayfairDisplay-Regular.ttf",
        "PlayfairDisplay-Medium.ttf",
        "PlayfairDisplay-SemiBold.ttf",
        "PlayfairDisplay-Bold.ttf",
      );
      break;
    case "outfit":
      set = family(
        "Outfit-Regular.ttf",
        "Outfit-Medium.ttf",
        "Outfit-SemiBold.ttf",
        "Outfit-Bold.ttf",
      );
      break;
    default:
      set = family(
        "Inter-Regular.ttf",
        "Inter-Medium.ttf",
        "Inter-SemiBold.ttf",
        "Inter-Bold.ttf",
        "Inter-Italic.ttf",
      );
  }
  cache.set(id, set);
  return set;
}

export type HeroTextStyle =
  | "regular"
  | "medium"
  | "semibold"
  | "bold"
  | "italic";

function measureWidth(
  font: Font,
  text: string,
  fontSize: number,
  trackingEm: number,
): number {
  const scale = (1 / font.unitsPerEm) * fontSize;
  let width = 0;
  const chars = [...text];
  for (let i = 0; i < chars.length; i++) {
    const glyph = font.charToGlyph(chars[i]!);
    width += (glyph.advanceWidth || 0) * scale;
    if (i < chars.length - 1) width += fontSize * trackingEm;
  }
  return width;
}

function pickFont(set: HeroFontSet, style: HeroTextStyle): Font {
  switch (style) {
    case "bold":
      return set.bold;
    case "semibold":
      return set.semibold;
    case "medium":
      return set.medium;
    case "italic":
      return set.italic;
    default:
      return set.regular;
  }
}

/**
 * Convert a line of text to a centered SVG path so sharp/librsvg never needs
 * system fonts (which are missing on Vercel and show as □□□□).
 */
export function heroTextPath(opts: {
  text: string;
  x: number;
  y: number;
  fontSize: number;
  style?: HeroTextStyle;
  fill?: string;
  fillOpacity?: number;
  fontFamily?: BrandHeadingFont;
  /** Extra spacing between glyphs as a fraction of fontSize */
  trackingEm?: number;
  /** Left = x is left edge; center = x is midpoint (default). */
  align?: "left" | "center";
}): string {
  if (!opts.text) return "";
  const set = fontsFor(opts.fontFamily ?? "inter");
  const font = pickFont(set, opts.style ?? "regular");
  const trackingEm = opts.trackingEm ?? 0;

  const totalWidth = measureWidth(font, opts.text, opts.fontSize, trackingEm);
  let cursor =
    opts.align === "left" ? opts.x : opts.x - totalWidth / 2;
  const scale = (1 / font.unitsPerEm) * opts.fontSize;
  const segments: string[] = [];
  const chars = [...opts.text];

  for (let i = 0; i < chars.length; i++) {
    const char = chars[i]!;
    const glyph = font.charToGlyph(char);
    const path = glyph.getPath(cursor, opts.y, opts.fontSize);
    const d = path.toPathData(2);
    if (d) segments.push(d);
    cursor += (glyph.advanceWidth || 0) * scale;
    if (i < chars.length - 1) cursor += opts.fontSize * trackingEm;
  }

  if (segments.length === 0) return "";

  const fill = opts.fill ?? "#FFFFFF";
  const opacity =
    opts.fillOpacity == null ? "" : ` fill-opacity="${opts.fillOpacity}"`;
  return segments
    .map((d) => `<path d="${d}" fill="${fill}"${opacity}/>`)
    .join("");
}
