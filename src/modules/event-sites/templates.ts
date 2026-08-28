import type { EventSiteConfig } from "./config";
import type { EventSiteSectionType } from "./sections";

export const EVENT_SITE_TEMPLATE_IDS = [
  "executive-summit",
  "global-conference",
  "investment-forum",
  "modern-conference",
  "government-institutional",
] as const;

export type EventSiteTemplateId = (typeof EVENT_SITE_TEMPLATE_IDS)[number];

/** Legacy v1 template ids mapped to v2. */
export const LEGACY_TEMPLATE_MAP: Record<string, EventSiteTemplateId> = {
  summit: "executive-summit",
  conference: "global-conference",
  minimal: "modern-conference",
};

export type EventSiteTemplateMeta = {
  id: EventSiteTemplateId;
  label: string;
  description: string;
  heroVariant: "full" | "split" | "compact" | "editorial";
  previewGradient: string;
  defaultSections: EventSiteSectionType[];
};

export const EVENT_SITE_TEMPLATES: EventSiteTemplateMeta[] = [
  {
    id: "executive-summit",
    label: "Executive Summit",
    description:
      "Bold full-bleed hero, speaker spotlight, and premium statistics — for flagship summits.",
    heroVariant: "full",
    previewGradient: "from-slate-900 via-indigo-950 to-slate-900",
    defaultSections: [
      "header",
      "hero",
      "statistics",
      "about",
      "speakers",
      "agenda",
      "sponsors",
      "registration-cta",
      "footer",
    ],
  },
  {
    id: "global-conference",
    label: "Global Conference",
    description:
      "Split hero with imagery, structured programme, and sponsor tiers.",
    heroVariant: "split",
    previewGradient: "from-indigo-600 via-violet-600 to-indigo-800",
    defaultSections: [
      "header",
      "hero",
      "about",
      "event-details",
      "agenda",
      "speakers",
      "sponsors",
      "venue",
      "registration-cta",
      "footer",
    ],
  },
  {
    id: "investment-forum",
    label: "Investment Forum",
    description:
      "Editorial typography, testimonials, and data-driven statistics for deal-making events.",
    heroVariant: "editorial",
    previewGradient: "from-amber-900 via-stone-800 to-amber-950",
    defaultSections: [
      "header",
      "hero",
      "statistics",
      "about",
      "speakers",
      "testimonials",
      "agenda",
      "registration-cta",
      "footer",
    ],
  },
  {
    id: "modern-conference",
    label: "Modern Conference",
    description:
      "Clean minimal layout with essential details and strong typography.",
    heroVariant: "compact",
    previewGradient: "from-zinc-100 via-white to-zinc-200",
    defaultSections: [
      "header",
      "hero",
      "event-details",
      "about",
      "registration-cta",
      "footer",
    ],
  },
  {
    id: "government-institutional",
    label: "Government & Institutional",
    description:
      "Formal, accessible layout with FAQ, contact, and structured programme.",
    heroVariant: "full",
    previewGradient: "from-slate-800 via-slate-700 to-slate-900",
    defaultSections: [
      "header",
      "hero",
      "about",
      "event-details",
      "agenda",
      "speakers",
      "faq",
      "contact",
      "footer",
    ],
  },
];

export function getEventSiteTemplate(
  id: string | undefined | null,
): EventSiteTemplateMeta {
  const normalized = parseTemplateId(id);
  return (
    EVENT_SITE_TEMPLATES.find((t) => t.id === normalized) ??
    EVENT_SITE_TEMPLATES[0]!
  );
}

export function listEventSiteTemplates(): EventSiteTemplateMeta[] {
  return [...EVENT_SITE_TEMPLATES];
}

export function parseTemplateId(value: unknown): EventSiteTemplateId {
  const id = String(value ?? "");
  if (EVENT_SITE_TEMPLATE_IDS.includes(id as EventSiteTemplateId)) {
    return id as EventSiteTemplateId;
  }
  if (id in LEGACY_TEMPLATE_MAP) {
    return LEGACY_TEMPLATE_MAP[id]!;
  }
  return "executive-summit";
}

export function templateThemePreset(
  templateId: EventSiteTemplateId,
): EventSiteConfig["theme"]["preset"] {
  switch (templateId) {
    case "investment-forum":
      return "elegant";
    case "government-institutional":
      return "corporate";
    case "modern-conference":
      return "minimal";
    case "global-conference":
      return "modern";
    default:
      return "bold";
  }
}

export function templateGlobalStyles(
  templateId: EventSiteTemplateId,
): Partial<EventSiteConfig["globalStyles"]> {
  switch (templateId) {
    case "modern-conference":
      return { sectionSpacing: "compact", navStyle: "sticky-light" };
    case "government-institutional":
      return { navStyle: "sticky-dark", borderRadius: "md" };
    case "investment-forum":
      return { borderRadius: "sm", buttonStyle: "outline" };
    default:
      return {};
  }
}
