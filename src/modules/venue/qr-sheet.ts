import "server-only";

import { strToU8 } from "fflate";

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** Split a long label into up to two centered lines for the print sheet. */
function labelLines(label: string, maxLen = 28): string[] {
  const text = label.trim() || "Checkpoint";
  if (text.length <= maxLen) return [text];
  const words = text.split(/\s+/);
  const lines: string[] = [""];
  for (const word of words) {
    const current = lines[lines.length - 1]!;
    const next = current ? `${current} ${word}` : word;
    if (next.length <= maxLen) {
      lines[lines.length - 1] = next;
    } else if (lines.length < 2) {
      lines.push(word);
    } else {
      lines[1] = `${lines[1]} ${word}`.slice(0, maxLen);
      break;
    }
  }
  return lines.filter(Boolean).slice(0, 2);
}

/**
 * Printable SVG card: location label above the QR (embedded PNG), footer below.
 * Opens/prints cleanly; label is part of the artwork, not only the filename.
 */
export function buildLabeledQrSheetSvg(input: {
  label: string;
  qrPngDataUrl: string;
  floorName?: string | null;
}): string {
  const lines = labelLines(input.label);
  const width = 520;
  const qrSize = 360;
  const sidePad = (width - qrSize) / 2;
  const topPad = 36;
  const lineHeight = 32;
  const labelBlock = lines.length * lineHeight;
  const qrY = topPad + labelBlock + 20;
  const footerY = qrY + qrSize + 36;
  const height = footerY + 28;

  const labelSvg = lines
    .map((line, i) => {
      const y = topPad + lineHeight * (i + 1) - 8;
      return `<text x="${width / 2}" y="${y}" text-anchor="middle" font-family="Inter, Helvetica, Arial, sans-serif" font-size="26" font-weight="700" fill="#0f172a">${escapeXml(line)}</text>`;
    })
    .join("\n  ");

  const subtitle = input.floorName
    ? `<text x="${width / 2}" y="${footerY}" text-anchor="middle" font-family="Inter, Helvetica, Arial, sans-serif" font-size="14" fill="#64748b">${escapeXml(input.floorName)} · Venue QR</text>`
    : `<text x="${width / 2}" y="${footerY}" text-anchor="middle" font-family="Inter, Helvetica, Arial, sans-serif" font-size="14" fill="#64748b">Venue QR · scan for map</text>`;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="${width}" height="${height}" fill="#ffffff"/>
  ${labelSvg}
  <image x="${sidePad}" y="${qrY}" width="${qrSize}" height="${qrSize}" href="${input.qrPngDataUrl}" xlink:href="${input.qrPngDataUrl}"/>
  ${subtitle}
</svg>
`;
}

export function labeledQrSheetBytes(input: {
  label: string;
  qrPngDataUrl: string;
  floorName?: string | null;
}): Uint8Array {
  return strToU8(buildLabeledQrSheetSvg(input));
}
