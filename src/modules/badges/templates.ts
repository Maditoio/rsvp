/** Standard label sizes for common badge / label printers (Phase 4). */
export const BADGE_TEMPLATE_IDS = [
  "zebra_4x3",
  "zebra_4x6",
  "dymo_30256",
  "dymo_11356",
  "brother_dk11201",
  "avery_5392",
  "cr80_lanyard",
  "cr80_portrait",
] as const;

export type BadgeTemplateId = (typeof BADGE_TEMPLATE_IDS)[number];

export type BadgeTemplate = {
  id: BadgeTemplateId;
  name: string;
  /** Printer / label line hint for organisers */
  printerHint: string;
  widthMm: number;
  heightMm: number;
  widthIn: number;
  heightIn: number;
  /** CSS @page size when printing one badge per sheet */
  pageSize: string;
  /** Layout density */
  layout: "horizontal" | "vertical";
};

export const BADGE_TEMPLATES: Record<BadgeTemplateId, BadgeTemplate> = {
  zebra_4x3: {
    id: "zebra_4x3",
    name: '4″ × 3″ name badge',
    printerHint: "Zebra ZD/ZT, Brother QL — 101×76 mm",
    widthMm: 101.6,
    heightMm: 76.2,
    widthIn: 4,
    heightIn: 3,
    pageSize: "101.6mm 76.2mm",
    layout: "horizontal",
  },
  zebra_4x6: {
    id: "zebra_4x6",
    name: '4″ × 6″ shipping / large badge',
    printerHint: "Zebra GK/GX, Rollo — 102×152 mm",
    widthMm: 101.6,
    heightMm: 152.4,
    widthIn: 4,
    heightIn: 6,
    pageSize: "101.6mm 152.4mm",
    layout: "vertical",
  },
  dymo_30256: {
    id: "dymo_30256",
    name: "Dymo 30256 name badge",
    printerHint: "Dymo LabelWriter — 59×102 mm (2¼″ × 4″)",
    widthMm: 59,
    heightMm: 102,
    widthIn: 2.25,
    heightIn: 4,
    pageSize: "59mm 102mm",
    layout: "vertical",
  },
  dymo_11356: {
    id: "dymo_11356",
    name: "Dymo 11356 large multipurpose",
    printerHint: "Dymo LabelWriter — 57×89 mm (2¼″ × 3½″)",
    widthMm: 57,
    heightMm: 89,
    widthIn: 2.25,
    heightIn: 3.5,
    pageSize: "57mm 89mm",
    layout: "vertical",
  },
  brother_dk11201: {
    id: "brother_dk11201",
    name: "Brother DK-11201",
    printerHint: "Brother QL — 29×90 mm address label",
    widthMm: 29,
    heightMm: 90,
    widthIn: 1.14,
    heightIn: 3.54,
    pageSize: "29mm 90mm",
    layout: "vertical",
  },
  avery_5392: {
    id: "avery_5392",
    name: "Avery 5392 insert",
    printerHint: "Avery laser/inkjet — 86×59 mm (3⅜″ × 2⅓″)",
    widthMm: 85.7,
    heightMm: 59.3,
    widthIn: 3.375,
    heightIn: 2.333,
    pageSize: "85.7mm 59.3mm",
    layout: "horizontal",
  },
  cr80_lanyard: {
    id: "cr80_lanyard",
    name: "CR80 landscape",
    printerHint: "85.6×54 mm (ISO ID-1) — landscape",
    widthMm: 85.6,
    heightMm: 54,
    widthIn: 3.375,
    heightIn: 2.125,
    pageSize: "85.6mm 54mm",
    layout: "horizontal",
  },
  cr80_portrait: {
    id: "cr80_portrait",
    name: "CR80 portrait",
    printerHint: "54×85.6 mm (ISO ID-1) — portrait / A4 cut-out",
    widthMm: 54,
    heightMm: 85.6,
    widthIn: 2.125,
    heightIn: 3.375,
    pageSize: "54mm 85.6mm",
    layout: "vertical",
  },
};

export function getBadgeTemplate(id: string): BadgeTemplate {
  if (id in BADGE_TEMPLATES) {
    return BADGE_TEMPLATES[id as BadgeTemplateId];
  }
  return BADGE_TEMPLATES.zebra_4x3;
}

export function listBadgeTemplates(): BadgeTemplate[] {
  return BADGE_TEMPLATE_IDS.map((id) => BADGE_TEMPLATES[id]);
}
