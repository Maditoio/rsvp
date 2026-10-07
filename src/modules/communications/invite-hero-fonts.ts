import { readFileSync } from "node:fs";
import { join } from "node:path";
import opentype, { type Font } from "opentype.js";

type HeroFontSet = {
  regular: Font;
  bold: Font;
  italic: Font;
};

let cached: HeroFontSet | null = null;

function loadFont(filename: string): Font {
  const path = join(process.cwd(), "assets/fonts/invite-hero", filename);
  const buffer = readFileSync(path);
  return opentype.parse(
    buffer.buffer.slice(
      buffer.byteOffset,
      buffer.byteOffset + buffer.byteLength,
    ),
  );
}

function fonts(): HeroFontSet {
  if (!cached) {
    cached = {
      regular: loadFont("Inter-Regular.ttf"),
      bold: loadFont("Inter-Bold.ttf"),
      italic: loadFont("Inter-Italic.ttf"),
    };
  }
  return cached;
}

export type HeroTextStyle = "regular" | "bold" | "italic";

function measureWidth(font: Font, text: string, fontSize: number): number {
  const scale = (1 / font.unitsPerEm) * fontSize;
  let width = 0;
  for (const char of text) {
    const glyph = font.charToGlyph(char);
    width += (glyph.advanceWidth || 0) * scale;
  }
  return width;
}

/**
 * Convert a line of text to a centered SVG path so sharp/librsvg never needs
 * system fonts (which are missing on Vercel and show as □□□□).
 *
 * Glyphs are walked per-character to avoid Inter OpenType features that
 * crash opentype.js's shaper.
 */
export function heroTextPath(opts: {
  text: string;
  x: number;
  y: number;
  fontSize: number;
  style?: HeroTextStyle;
  fill?: string;
  fillOpacity?: number;
}): string {
  if (!opts.text) return "";
  const set = fonts();
  const font =
    opts.style === "bold"
      ? set.bold
      : opts.style === "italic"
        ? set.italic
        : set.regular;

  const totalWidth = measureWidth(font, opts.text, opts.fontSize);
  let cursor = opts.x - totalWidth / 2;
  const scale = (1 / font.unitsPerEm) * opts.fontSize;
  const segments: string[] = [];

  for (const char of textChars(opts.text)) {
    const glyph = font.charToGlyph(char);
    const path = glyph.getPath(cursor, opts.y, opts.fontSize);
    const d = path.toPathData(2);
    if (d) segments.push(d);
    cursor += (glyph.advanceWidth || 0) * scale;
  }

  if (segments.length === 0) return "";

  const fill = opts.fill ?? "#FFFFFF";
  const opacity =
    opts.fillOpacity == null ? "" : ` fill-opacity="${opts.fillOpacity}"`;
  // One path per glyph keeps commands valid without joining with spaces oddly.
  return segments
    .map((d) => `<path d="${d}" fill="${fill}"${opacity}/>`)
    .join("");
}

function textChars(text: string): string[] {
  return [...text];
}
