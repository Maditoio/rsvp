import { z } from "zod";
import {
  DEFAULT_GLOBAL_STYLES,
  DEFAULT_EVENT_SITE_THEME,
  normalizeTheme,
  type EventSiteGlobalStyles,
  type EventSiteThemeTokens,
} from "./theme";
import {
  EVENT_SITE_TEMPLATE_IDS,
  parseTemplateId,
  getEventSiteTemplate,
  templateThemePreset,
  templateGlobalStyles,
  type EventSiteTemplateId,
} from "./templates";
import {
  createSection,
  sortSections,
  type EventSiteSection,
  type EventSiteSectionType,
} from "./sections";
import { applyThemePreset } from "./theme";
import { EVENT_SITE_FONT_IDS } from "./fonts";

export const EVENT_SITE_CTA_TYPES = [
  "public_apply",
  "external",
  "hidden",
] as const;

export type EventSiteCtaType = (typeof EVENT_SITE_CTA_TYPES)[number];

export const EVENT_SITE_SCHEMA_VERSION = 2;

const speakerSchema = z.object({
  id: z.string().min(1),
  firstName: z.string().max(60).default(""),
  lastName: z.string().max(60).default(""),
  jobTitle: z.string().max(160).optional(),
  organization: z.string().max(160).optional(),
  country: z.string().max(80).optional(),
  photoUrl: z.string().url().optional().nullable(),
  bio: z.string().max(800).optional(),
  linkedIn: z.string().url().optional().nullable(),
  website: z.string().url().optional().nullable(),
  featured: z.boolean().default(false),
  order: z.number().int().min(0).default(0),
  hidden: z.boolean().default(false),
});

export type EventSiteSpeaker = z.infer<typeof speakerSchema>;

export function speakerDisplayName(s: EventSiteSpeaker): string {
  const name = [s.firstName, s.lastName].filter(Boolean).join(" ").trim();
  return name || "Speaker";
}

const sectionSchema = z.object({
  id: z.string().min(1),
  type: z.enum([
    "header",
    "hero",
    "about",
    "event-details",
    "speakers",
    "agenda",
    "sponsors",
    "venue",
    "gallery",
    "content",
    "registration-cta",
    "contact",
    "footer",
    "statistics",
    "testimonials",
    "faq",
  ]),
  order: z.number().int().min(0),
  enabled: z.boolean(),
  variant: z.string(),
  content: z.record(z.string(), z.unknown()),
  settings: z.record(z.string(), z.unknown()).default({}),
});

const themeSchema = z.object({
  preset: z
    .enum(["modern", "corporate", "elegant", "bold", "minimal"])
    .default("modern"),
  primaryColor: z.string().default(DEFAULT_EVENT_SITE_THEME.primaryColor),
  secondaryColor: z.string().default(DEFAULT_EVENT_SITE_THEME.secondaryColor),
  accentColor: z.string().default(DEFAULT_EVENT_SITE_THEME.accentColor),
  backgroundColor: z.string().default(DEFAULT_EVENT_SITE_THEME.backgroundColor),
  textColor: z.string().default(DEFAULT_EVENT_SITE_THEME.textColor),
  headingFont: z.enum(EVENT_SITE_FONT_IDS).default(DEFAULT_EVENT_SITE_THEME.headingFont),
  bodyFont: z.enum(EVENT_SITE_FONT_IDS).default(DEFAULT_EVENT_SITE_THEME.bodyFont),
});

const globalStylesSchema = z.object({
  buttonStyle: z.enum(["solid", "outline", "ghost"]).default("solid"),
  borderRadius: z.enum(["none", "sm", "md", "lg", "full"]).default("full"),
  sectionSpacing: z.enum(["compact", "normal", "spacious"]).default("normal"),
  containerWidth: z.enum(["narrow", "default", "wide"]).default("default"),
  navStyle: z
    .enum(["transparent", "solid", "sticky-light", "sticky-dark"])
    .default("sticky-light"),
});

const seoSchema = z.object({
  title: z.string().max(120).default(""),
  description: z.string().max(320).default(""),
  ogImage: z.string().url().nullable().default(null),
  keywords: z.array(z.string().max(40)).max(12).default([]),
});

export const eventSiteConfigSchema = z.object({
  schemaVersion: z.literal(2).default(2),
  templateId: z.enum(EVENT_SITE_TEMPLATE_IDS).default("executive-summit"),
  theme: themeSchema,
  globalStyles: globalStylesSchema.default(DEFAULT_GLOBAL_STYLES),
  sections: z.array(sectionSchema).min(1),
  seo: seoSchema.default({ title: "", description: "", ogImage: null, keywords: [] }),
});

export type EventSiteConfig = z.infer<typeof eventSiteConfigSchema>;

function normalizeSpeakers(raw: unknown[]): EventSiteSpeaker[] {
  return raw.map((item, index) => {
    const r = item as Record<string, unknown>;
    if (typeof r.firstName === "string" || typeof r.lastName === "string") {
      const parsed = speakerSchema.safeParse({ ...r, order: r.order ?? index });
      if (parsed.success) return parsed.data;
    }
    const legacyName = String(r.name ?? "Speaker");
    const parts = legacyName.split(/\s+/);
    const firstName = parts[0] ?? "Speaker";
    const lastName = parts.slice(1).join(" ");
    return speakerSchema.parse({
      id: String(r.id ?? `spk_${index}`),
      firstName,
      lastName,
      jobTitle: r.title ?? r.jobTitle,
      organization: r.company ?? r.organization,
      photoUrl: r.imageUrl ?? r.photoUrl ?? null,
      bio: r.bio,
      featured: r.featured ?? false,
      order: typeof r.order === "number" ? r.order : index,
      hidden: r.hidden ?? false,
    });
  });
}

function migrateLegacyConfig(raw: Record<string, unknown>): EventSiteConfig {
  const templateId = parseTemplateId(raw.templateId);
  const template = getEventSiteTemplate(templateId);
  const preset = templateThemePreset(templateId);
  const theme = normalizeTheme({
    ...applyThemePreset(preset),
    preset,
    accentColor: (raw.theme as { accentColor?: string })?.accentColor,
    primaryColor: (raw.theme as { heroColor?: string })?.heroColor,
  });

  const globalStyles: EventSiteGlobalStyles = {
    ...DEFAULT_GLOBAL_STYLES,
    ...templateGlobalStyles(templateId),
  };

  const hero = raw.hero as Record<string, unknown> | undefined;
  const about = raw.about as Record<string, unknown> | undefined;
  const agenda = raw.agenda as Record<string, unknown> | undefined;
  const speakers = raw.speakers as Record<string, unknown> | undefined;
  const cta = raw.cta as Record<string, unknown> | undefined;

  const sections: EventSiteSection[] = template.defaultSections.map(
    (type, order) => {
      const section = createSection(type, order, {
        variant:
          type === "hero" ? template.heroVariant : undefined,
        enabled: true,
      });

      if (type === "hero" && hero) {
        section.enabled = hero.enabled !== false;
        section.content = {
          ...section.content,
          headline: String(hero.headline ?? ""),
          subheadline: String(hero.subheadline ?? ""),
          imageUrl: hero.imageUrl ?? null,
          showDates: hero.showDates !== false,
          showVenue: hero.showVenue !== false,
          primaryCtaLabel: String(cta?.label ?? "Register now"),
        };
      }
      if (type === "about" && about) {
        section.enabled = about.enabled !== false;
        section.content = {
          ...section.content,
          title: String(about.title ?? "About the event"),
          body: String(about.body ?? ""),
        };
      }
      if (type === "agenda" && agenda) {
        section.enabled = agenda.enabled !== false;
        section.content = {
          ...section.content,
          title: String(agenda.title ?? "Agenda"),
          maxSessions:
            typeof agenda.maxSessions === "number" ? agenda.maxSessions : 8,
        };
      }
      if (type === "speakers" && speakers) {
        section.enabled = speakers.enabled !== false;
        section.content = {
          ...section.content,
          title: String(speakers.title ?? "Speakers"),
          items: normalizeSpeakers(
            Array.isArray(speakers.items) ? speakers.items : [],
          ),
        };
      }
      if (type === "registration-cta" && cta) {
        section.content = {
          ...section.content,
          ctaType: cta.type ?? "public_apply",
          ctaLabel: String(cta.label ?? "Register now"),
          externalUrl: cta.externalUrl ?? null,
        };
      }

      return section;
    },
  );

  return finalizeConfig({
    schemaVersion: 2,
    templateId,
    theme,
    globalStyles,
    sections,
    seo: { title: "", description: "", ogImage: null, keywords: [] },
  });
}

function finalizeConfig(input: {
  schemaVersion: 2;
  templateId: EventSiteTemplateId;
  theme: EventSiteThemeTokens;
  globalStyles: EventSiteGlobalStyles;
  sections: EventSiteSection[];
  seo: EventSiteConfig["seo"];
}): EventSiteConfig {
  const parsed = eventSiteConfigSchema.safeParse({
    ...input,
    theme: input.theme,
    sections: sortSections(input.sections),
  });
  if (parsed.success) {
    return {
      ...parsed.data,
      theme: normalizeTheme(parsed.data.theme),
    };
  }
  return buildDefaultConfig(input.templateId);
}

export function buildDefaultConfig(
  templateId: EventSiteTemplateId = "executive-summit",
): EventSiteConfig {
  const template = getEventSiteTemplate(templateId);
  const preset = templateThemePreset(templateId);
  const theme = normalizeTheme({ ...applyThemePreset(preset), preset });
  const globalStyles: EventSiteGlobalStyles = {
    ...DEFAULT_GLOBAL_STYLES,
    ...templateGlobalStyles(templateId),
  };

  const sections = template.defaultSections.map((type, order) =>
    createSection(type, order, {
      variant: type === "hero" ? template.heroVariant : undefined,
    }),
  );

  return finalizeConfig({
    schemaVersion: 2,
    templateId,
    theme,
    globalStyles,
    sections,
    seo: { title: "", description: "", ogImage: null, keywords: [] },
  });
}

export const DEFAULT_EVENT_SITE_CONFIG = buildDefaultConfig();

export function parseEventSiteConfig(value: unknown): EventSiteConfig {
  if (!value || typeof value !== "object") {
    return { ...DEFAULT_EVENT_SITE_CONFIG };
  }

  const raw = value as Record<string, unknown>;

  if (raw.schemaVersion !== 2 || !Array.isArray(raw.sections)) {
    return migrateLegacyConfig(raw);
  }

  const sections = (raw.sections as EventSiteSection[]).map((s) => {
    if (s.type === "speakers" && Array.isArray(s.content?.items)) {
      return {
        ...s,
        content: {
          ...s.content,
          items: normalizeSpeakers(s.content.items as unknown[]),
        },
      };
    }
    return s;
  });

  const parsed = eventSiteConfigSchema.safeParse({
    ...raw,
    sections,
  });

  if (parsed.success) {
    return {
      ...parsed.data,
      theme: normalizeTheme(parsed.data.theme),
    };
  }

  return buildDefaultConfig(parseTemplateId(raw.templateId));
}

export function eventSiteConfigFromEvent(input: {
  name: string;
  description: string | null;
  venue: string | null;
  logoUrl: string | null;
  config?: EventSiteConfig;
}): EventSiteConfig {
  const base = input.config ?? DEFAULT_EVENT_SITE_CONFIG;
  const sections = base.sections.map((section) => {
    if (section.type !== "hero") return section;
    const content = section.content as Record<string, unknown>;
    return {
      ...section,
      content: {
        ...content,
        headline: String(content.headline || input.name),
        subheadline: String(
          content.subheadline || (input.description?.slice(0, 400) ?? ""),
        ),
        imageUrl: content.imageUrl ?? null,
      },
    };
  });

  const aboutPatched = sections.map((section) => {
    if (section.type !== "about") return section;
    const content = section.content as Record<string, unknown>;
    return {
      ...section,
      content: {
        ...content,
        body: String(content.body || (input.description ?? "")),
      },
    };
  });

  const venuePatched = aboutPatched.map((section) => {
    if (section.type !== "venue" || !input.venue) return section;
    const content = section.content as Record<string, unknown>;
    return {
      ...section,
      content: {
        ...content,
        address: String(content.address || input.venue),
      },
    };
  });

  const detailsPatched = venuePatched.map((section) => {
    if (section.type !== "event-details") return section;
    const content = section.content as Record<string, unknown>;
    return {
      ...section,
      content: {
        ...content,
        showDates: content.showDates !== false,
        showVenue: content.showVenue !== false && Boolean(input.venue),
        showTimezone: content.showTimezone !== false,
      },
    };
  });

  return { ...base, sections: detailsPatched };
}

export { newSpeakerId } from "./sections";
export { parseTemplateId } from "./templates";

export function eventSiteConfigToJson(
  config: EventSiteConfig,
): Record<string, unknown> {
  return JSON.parse(JSON.stringify(config)) as Record<string, unknown>;
}

export function getSectionContent<T extends Record<string, unknown>>(
  section: EventSiteSection,
): T {
  return section.content as T;
}

export function findSectionsByType(
  config: EventSiteConfig,
  type: EventSiteSectionType,
): EventSiteSection[] {
  return sortSections(config.sections.filter((s) => s.type === type));
}

export function getPrimaryCta(config: EventSiteConfig): {
  type: EventSiteCtaType;
  label: string;
  externalUrl: string | null;
} {
  const ctaSection = findSectionsByType(config, "registration-cta")[0];
  if (ctaSection) {
    const c = ctaSection.content as {
      ctaType?: EventSiteCtaType;
      ctaLabel?: string;
      externalUrl?: string | null;
    };
    return {
      type: c.ctaType ?? "public_apply",
      label: c.ctaLabel ?? "Register now",
      externalUrl: c.externalUrl ?? null,
    };
  }
  const hero = findSectionsByType(config, "hero")[0];
  if (hero) {
    const h = hero.content as { primaryCtaLabel?: string };
    return {
      type: "public_apply",
      label: h.primaryCtaLabel ?? "Register now",
      externalUrl: null,
    };
  }
  return { type: "public_apply", label: "Register now", externalUrl: null };
}

export function applyTemplateToConfig(
  config: EventSiteConfig,
  templateId: EventSiteTemplateId,
): EventSiteConfig {
  const template = getEventSiteTemplate(templateId);
  const preset = templateThemePreset(templateId);
  const existingByType = new Map<EventSiteSectionType, EventSiteSection[]>();
  for (const s of config.sections) {
    const list = existingByType.get(s.type as EventSiteSectionType) ?? [];
    list.push(s);
    existingByType.set(s.type as EventSiteSectionType, list);
  }

  const sections = template.defaultSections.map((type, order) => {
    const existing = existingByType.get(type)?.[0];
    if (existing) {
      return {
        ...existing,
        order,
        variant:
          type === "hero" ? template.heroVariant : existing.variant,
      };
    }
    return createSection(type, order, {
      variant: type === "hero" ? template.heroVariant : undefined,
    });
  });

  return finalizeConfig({
    schemaVersion: 2,
    templateId,
    theme: normalizeTheme({
      ...config.theme,
      ...applyThemePreset(preset),
      preset,
    }),
    globalStyles: {
      ...config.globalStyles,
      ...templateGlobalStyles(templateId),
    },
    sections,
    seo: config.seo,
  });
}
