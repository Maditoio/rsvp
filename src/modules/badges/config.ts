import { z } from "zod";
import { BADGE_TEMPLATE_IDS } from "./templates";
import {
  BADGE_DESIGN_IDS,
  LOGO_POSITIONS,
  QR_POSITIONS,
  QR_SIZES,
  SPONSOR_POSITIONS,
  getBadgeDesign,
} from "./designs";
import {
  BADGE_SIZE_DEFAULTS,
  BADGE_SIZE_MAX,
  BADGE_SIZE_MIN,
  CATEGORY_STYLES,
  TEXT_ALIGNMENTS,
  migrateQrPx,
  parseBadgeSize,
  parseCategoryStyle,
  parseNameWeight,
  parseTextAlign,
  qrPresetToPx,
} from "./sizing";
import {
  CLASSIC_LAYOUT,
  getLayoutPreset,
  parseBadgeLayout,
  type BadgeLayout,
} from "./layout";
import {
  TEXT_FILLS,
  BADGE_BG_FILLS,
  parseGradientAngle,
  parseHexColor,
  parseTextFill,
  parseBadgeBgFill,
  parseBadgeBgImageUrl,
  type BadgeTextFill,
  type BadgeBgFill,
} from "./colors";
import { BADGE_FONT_IDS, parseBadgeFont } from "./fonts";

export {
  BADGE_SIZE_DEFAULTS,
  BADGE_SIZE_MAX,
  BADGE_SIZE_MIN,
  CATEGORY_STYLES,
  NAME_WEIGHTS,
  TEXT_ALIGNMENTS,
  migrateQrPx,
  parseBadgeSize,
  parseCategoryStyle,
  parseNameWeight,
  parseTextAlign,
  qrPresetToPx,
} from "./sizing";
export type {
  BadgeCategoryStyle,
  BadgeNameWeight,
  BadgeTextAlign,
  BadgeSizeKey,
} from "./sizing";
export {
  BADGE_ELEMENT_IDS,
  BADGE_ELEMENT_LABELS,
  CLASSIC_LAYOUT,
  getLayoutPreset,
  moveLayoutElement,
  parseBadgeLayout,
} from "./layout";
export type { BadgeElementId, BadgeElementPose, BadgeLayout, HorizontalAnchor } from "./layout";
export {
  BADGE_COLOR_SWATCHES,
  BADGE_GRADIENT_PRESETS,
  TEXT_FILLS,
  BADGE_BG_FILLS,
  contrastRatio,
  gradientTextStyle,
  parseHexColor,
  parseTextFill,
  parseBadgeBgFill,
  parseBadgeBgImageUrl,
  qrColorsAreScannable,
  solidTextStyle,
  badgeBackgroundStyle,
} from "./colors";
export type { BadgeTextFill, BadgeBgFill } from "./colors";
export { BADGE_FONT_CSS, BADGE_FONT_IDS, BADGE_FONT_LABELS, parseBadgeFont } from "./fonts";
export type { BadgeFontId } from "./fonts";

const sizeSchema = z.coerce
  .number()
  .int()
  .min(BADGE_SIZE_MIN)
  .max(BADGE_SIZE_MAX);

const hexSchema = z
  .string()
  .regex(/^#([0-9A-Fa-f]{6}|[0-9A-Fa-f]{3})$/)
  .transform((v) => parseHexColor(v, v));

const poseSchema = z.object({
  x: z.coerce.number().min(0).max(100),
  y: z.coerce.number().min(0).max(100),
  zIndex: z.coerce.number().int().min(0).max(100).default(1),
  anchorX: z.enum(["left", "center", "right"]).optional(),
});

const layoutSchema = z.object({
  eventLogo: poseSchema,
  eventName: poseSchema,
  name: poseSchema,
  company: poseSchema,
  jobTitle: poseSchema,
  category: poseSchema,
  country: poseSchema,
  sponsors: poseSchema,
  qr: poseSchema,
});

export const badgeSponsorSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(80),
  url: z.string().min(1).max(2000),
});

export type BadgeSponsor = z.infer<typeof badgeSponsorSchema>;

export const badgeConfigSchema = z.object({
  templateId: z.enum(BADGE_TEMPLATE_IDS).default("zebra_4x3"),
  designId: z.enum(BADGE_DESIGN_IDS).default("classic"),
  showCompany: z.boolean().default(true),
  showJobTitle: z.boolean().default(true),
  showCategory: z.boolean().default(true),
  showCountry: z.boolean().default(false),
  showEventLogo: z.boolean().default(true),
  showEventName: z.boolean().default(true),
  showQr: z.boolean().default(true),
  showSponsors: z.boolean().default(true),
  /**
   * When true, name / company / job title / country stack in one column under
   * the name anchor so long names push details down instead of covering them.
   */
  stackAttendeeFields: z.boolean().default(true),
  /** Max lines for the attendee name (1–3). Extra text is ellipsized. */
  nameMaxLines: z.coerce.number().int().min(1).max(3).default(2),
  /** @deprecated Prefer layout canvas. Kept for migration / presets. */
  eventLogoPosition: z.enum(LOGO_POSITIONS).default("top"),
  qrPosition: z.enum(QR_POSITIONS).default("right"),
  qrSize: z.enum(QR_SIZES).default("md"),
  sponsorPosition: z.enum(SPONSOR_POSITIONS).default("bottom"),
  textAlign: z.enum(TEXT_ALIGNMENTS).default("center"),
  nameWeight: z
    .union([z.literal(400), z.literal(500), z.literal(600), z.literal(700)])
    .default(700),
  categoryStyle: z.enum(CATEGORY_STYLES).default("pill"),
  nameFont: z.enum(BADGE_FONT_IDS).default("inter"),
  companyFont: z.enum(BADGE_FONT_IDS).default("inter"),
  jobTitleFont: z.enum(BADGE_FONT_IDS).default("inter"),
  categoryFont: z.enum(BADGE_FONT_IDS).default("inter"),
  countryFont: z.enum(BADGE_FONT_IDS).default("inter"),
  eventNameFont: z.enum(BADGE_FONT_IDS).default("inter"),
  layout: layoutSchema.default(CLASSIC_LAYOUT),
  nameSize: sizeSchema.default(BADGE_SIZE_DEFAULTS.nameSize),
  companySize: sizeSchema.default(BADGE_SIZE_DEFAULTS.companySize),
  jobTitleSize: sizeSchema.default(BADGE_SIZE_DEFAULTS.jobTitleSize),
  categorySize: sizeSchema.default(BADGE_SIZE_DEFAULTS.categorySize),
  countrySize: sizeSchema.default(BADGE_SIZE_DEFAULTS.countrySize),
  eventNameSize: sizeSchema.default(BADGE_SIZE_DEFAULTS.eventNameSize),
  eventLogoSize: sizeSchema.default(BADGE_SIZE_DEFAULTS.eventLogoSize),
  sponsorLogoSize: sizeSchema.default(BADGE_SIZE_DEFAULTS.sponsorLogoSize),
  qrPx: sizeSchema.default(BADGE_SIZE_DEFAULTS.qrPx),
  contentGap: sizeSchema.default(BADGE_SIZE_DEFAULTS.contentGap),
  padding: sizeSchema.default(BADGE_SIZE_DEFAULTS.padding),
  borderRadius: sizeSchema.default(BADGE_SIZE_DEFAULTS.borderRadius),
  letterSpacing: sizeSchema.default(BADGE_SIZE_DEFAULTS.letterSpacing),
  nameColor: hexSchema.default("#0F172A"),
  companyColor: hexSchema.default("#475569"),
  jobTitleColor: hexSchema.default("#64748B"),
  categoryColor: hexSchema.default("#4F46E5"),
  countryColor: hexSchema.default("#64748B"),
  eventNameColor: hexSchema.default("#94A3B8"),
  nameFill: z.enum(TEXT_FILLS).default("solid"),
  nameGradientFrom: hexSchema.default("#4F46E5"),
  nameGradientTo: hexSchema.default("#8B5CF6"),
  nameGradientAngle: z.coerce.number().int().min(0).max(360).default(135),
  eventNameFill: z.enum(TEXT_FILLS).default("solid"),
  eventNameGradientFrom: hexSchema.default("#4F46E5"),
  eventNameGradientTo: hexSchema.default("#14B8A6"),
  eventNameGradientAngle: z.coerce.number().int().min(0).max(360).default(120),
  qrDarkColor: hexSchema.default("#1B1E2A"),
  qrLightColor: hexSchema.default("#FFFFFF"),
  badgeBgFill: z.enum(BADGE_BG_FILLS).default("solid"),
  badgeBgColor: hexSchema.default("#FFFFFF"),
  badgeBgGradientFrom: hexSchema.default("#FFFFFF"),
  badgeBgGradientTo: hexSchema.default("#EEF2FF"),
  badgeBgGradientAngle: z.coerce.number().int().min(0).max(360).default(160),
  /** Public blob URL for badge background image (when badgeBgFill is `image`). */
  badgeBgImageUrl: z.string().max(2000).default(""),
  selectedSponsorIds: z.array(z.string()).max(8).default([]),
  sponsors: z.array(badgeSponsorSchema).max(20).default([]),
});

export type BadgeConfig = z.infer<typeof badgeConfigSchema>;

export const DEFAULT_BADGE_CONFIG: BadgeConfig = badgeConfigSchema.parse({});

/** Apply a design preset’s canvas layout (keeps colours, sizes, sponsors). */
export function applyDesignPreset(
  config: BadgeConfig,
  designId: BadgeConfig["designId"],
): BadgeConfig {
  const design = getBadgeDesign(designId);
  return {
    ...config,
    designId: design.id,
    eventLogoPosition: design.eventLogoPosition,
    qrPosition: design.qrPosition,
    qrSize: design.qrSize,
    qrPx: qrPresetToPx(design.qrSize),
    sponsorPosition: design.sponsorPosition,
    layout: getLayoutPreset(design.id),
  };
}

function migrateSizeFields(
  value: Record<string, unknown>,
): Record<string, unknown> {
  const next = { ...value };
  const sizeKeys = [
    ["nameSize", BADGE_SIZE_DEFAULTS.nameSize],
    ["companySize", BADGE_SIZE_DEFAULTS.companySize],
    ["jobTitleSize", BADGE_SIZE_DEFAULTS.jobTitleSize],
    ["categorySize", BADGE_SIZE_DEFAULTS.categorySize],
    ["countrySize", BADGE_SIZE_DEFAULTS.countrySize],
    ["eventNameSize", BADGE_SIZE_DEFAULTS.eventNameSize],
    ["eventLogoSize", BADGE_SIZE_DEFAULTS.eventLogoSize],
    ["sponsorLogoSize", BADGE_SIZE_DEFAULTS.sponsorLogoSize],
    ["contentGap", BADGE_SIZE_DEFAULTS.contentGap],
    ["padding", BADGE_SIZE_DEFAULTS.padding],
    ["borderRadius", BADGE_SIZE_DEFAULTS.borderRadius],
    ["letterSpacing", BADGE_SIZE_DEFAULTS.letterSpacing],
  ] as const;

  for (const [key, base] of sizeKeys) {
    if (key in next) {
      next[key] = parseBadgeSize(next[key], base, base);
    }
  }

  next.qrPx = migrateQrPx(next);
  next.textAlign = parseTextAlign(next.textAlign);
  next.nameWeight = parseNameWeight(next.nameWeight);
  next.categoryStyle = parseCategoryStyle(next.categoryStyle);

  const designId =
    typeof next.designId === "string" ? next.designId : "classic";
  next.layout = parseBadgeLayout(
    next.layout,
    getLayoutPreset(designId),
  );

  if (!("showSponsors" in next) && typeof next.sponsorPosition === "string") {
    next.showSponsors = next.sponsorPosition !== "none";
  }
  if (!("stackAttendeeFields" in next)) {
    next.stackAttendeeFields = true;
  }
  if (!("nameMaxLines" in next)) {
    next.nameMaxLines = 2;
  }

  next.nameFont = parseBadgeFont(next.nameFont);
  next.companyFont = parseBadgeFont(next.companyFont);
  next.jobTitleFont = parseBadgeFont(next.jobTitleFont);
  next.categoryFont = parseBadgeFont(next.categoryFont);
  next.countryFont = parseBadgeFont(next.countryFont);
  next.eventNameFont = parseBadgeFont(next.eventNameFont);

  next.nameColor = parseHexColor(next.nameColor, "#0F172A");
  next.companyColor = parseHexColor(next.companyColor, "#475569");
  next.jobTitleColor = parseHexColor(next.jobTitleColor, "#64748B");
  next.categoryColor = parseHexColor(next.categoryColor, "#4F46E5");
  next.countryColor = parseHexColor(next.countryColor, "#64748B");
  next.eventNameColor = parseHexColor(next.eventNameColor, "#94A3B8");
  next.nameFill = parseTextFill(next.nameFill);
  next.nameGradientFrom = parseHexColor(next.nameGradientFrom, "#4F46E5");
  next.nameGradientTo = parseHexColor(next.nameGradientTo, "#8B5CF6");
  next.nameGradientAngle = parseGradientAngle(next.nameGradientAngle, 135);
  next.eventNameFill = parseTextFill(next.eventNameFill);
  next.eventNameGradientFrom = parseHexColor(
    next.eventNameGradientFrom,
    "#4F46E5",
  );
  next.eventNameGradientTo = parseHexColor(next.eventNameGradientTo, "#14B8A6");
  next.eventNameGradientAngle = parseGradientAngle(
    next.eventNameGradientAngle,
    120,
  );
  next.qrDarkColor = parseHexColor(next.qrDarkColor, "#1B1E2A");
  next.qrLightColor = parseHexColor(next.qrLightColor, "#FFFFFF");
  next.badgeBgFill = parseBadgeBgFill(next.badgeBgFill);
  next.badgeBgColor = parseHexColor(next.badgeBgColor, "#FFFFFF");
  next.badgeBgGradientFrom = parseHexColor(next.badgeBgGradientFrom, "#FFFFFF");
  next.badgeBgGradientTo = parseHexColor(next.badgeBgGradientTo, "#EEF2FF");
  next.badgeBgGradientAngle = parseGradientAngle(
    next.badgeBgGradientAngle,
    160,
  );
  next.badgeBgImageUrl = parseBadgeBgImageUrl(next.badgeBgImageUrl);

  return next;
}

export function parseBadgeConfig(value: unknown): BadgeConfig {
  if (value && typeof value === "object") {
    const migrated = migrateSizeFields(value as Record<string, unknown>);
    const parsed = badgeConfigSchema.safeParse(migrated);
    if (parsed.success) return parsed.data;

    const partial = badgeConfigSchema.partial().safeParse(migrated);
    if (partial.success) {
      const merged = { ...DEFAULT_BADGE_CONFIG, ...partial.data };
      if (!("designId" in value) && !("qrPosition" in value) && !("layout" in value)) {
        return applyDesignPreset(merged, merged.designId);
      }
      if (!merged.layout) {
        merged.layout = getLayoutPreset(merged.designId);
      }
      return merged;
    }
  }

  const parsed = badgeConfigSchema.safeParse(value);
  if (parsed.success) return parsed.data;
  return DEFAULT_BADGE_CONFIG;
}

export function selectedSponsors(
  config: BadgeConfig,
  eventSponsors?: BadgeSponsor[],
): BadgeSponsor[] {
  if (config.showSponsors === false) return [];
  const source = eventSponsors ?? config.sponsors;
  const byId = new Map(source.map((s) => [s.id, s]));
  return config.selectedSponsorIds
    .map((id) => byId.get(id))
    .filter((s): s is BadgeSponsor => Boolean(s));
}

export function serializeLayout(layout: BadgeLayout): string {
  return JSON.stringify(layout);
}
