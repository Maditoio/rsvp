/** A4 multi-up packing for cut-out badge sheets. */

export const A4_WIDTH_MM = 210;
export const A4_HEIGHT_MM = 297;

export const BADGE_PRINT_SHEETS = ["label", "a4"] as const;
export type BadgePrintSheet = (typeof BADGE_PRINT_SHEETS)[number];

export type A4SheetLayout = {
  pageSizeCss: "A4";
  cols: number;
  rows: number;
  perPage: number;
  marginMm: number;
  gapMm: number;
  badgeWidthMm: number;
  badgeHeightMm: number;
};

export function parseBadgePrintSheet(
  value: unknown,
  fallback: BadgePrintSheet = "label",
): BadgePrintSheet {
  if (value === "label" || value === "a4") return value;
  return fallback;
}

/**
 * How many badges of a given size fit on one A4 page.
 * Default margins/gaps leave a little room for scissors between cards.
 */
export function computeA4SheetLayout(
  widthMm: number,
  heightMm: number,
  options?: { marginMm?: number; gapMm?: number },
): A4SheetLayout {
  const marginMm = options?.marginMm ?? 8;
  const gapMm = options?.gapMm ?? 3;
  const usableW = Math.max(0, A4_WIDTH_MM - 2 * marginMm);
  const usableH = Math.max(0, A4_HEIGHT_MM - 2 * marginMm);
  const cols = Math.max(1, Math.floor((usableW + gapMm) / (widthMm + gapMm)));
  const rows = Math.max(1, Math.floor((usableH + gapMm) / (heightMm + gapMm)));
  return {
    pageSizeCss: "A4",
    cols,
    rows,
    perPage: cols * rows,
    marginMm,
    gapMm,
    badgeWidthMm: widthMm,
    badgeHeightMm: heightMm,
  };
}

export function chunkForPages<T>(items: T[], perPage: number): T[][] {
  const size = Math.max(1, perPage);
  const pages: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    pages.push(items.slice(i, i + size));
  }
  return pages.length > 0 ? pages : [[]];
}
