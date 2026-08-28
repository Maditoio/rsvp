export function newSpeakerId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `spk_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export const EVENT_SITE_SECTION_TYPES = [
  "header",
  "hero",
  "about",
  "event-details",
  "speakers",
  "agenda",
  "sponsors",
  "venue",
  "gallery",
  "registration-cta",
  "contact",
  "footer",
  "statistics",
  "testimonials",
  "faq",
] as const;

export type EventSiteSectionType = (typeof EVENT_SITE_SECTION_TYPES)[number];

export type EventSiteSection = {
  id: string;
  type: EventSiteSectionType;
  order: number;
  enabled: boolean;
  variant: string;
  content: Record<string, unknown>;
  settings: Record<string, unknown>;
};

export const SECTION_TYPE_LABELS: Record<EventSiteSectionType, string> = {
  header: "Header / Navigation",
  hero: "Hero",
  about: "About",
  "event-details": "Event Details",
  speakers: "Speakers",
  agenda: "Agenda",
  sponsors: "Sponsors",
  venue: "Venue",
  gallery: "Gallery",
  "registration-cta": "Registration CTA",
  contact: "Contact",
  footer: "Footer",
  statistics: "Statistics",
  testimonials: "Testimonials",
  faq: "FAQ",
};

export function newSectionId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `sec_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function defaultSectionContent(
  type: EventSiteSectionType,
): Record<string, unknown> {
  switch (type) {
    case "header":
      return { showLogo: true, sticky: true };
    case "hero":
      return {
        headline: "",
        subheadline: "",
        eyebrow: "",
        imageUrl: null,
        overlay: "gradient",
        showDates: true,
        showVenue: true,
        showLogo: true,
        primaryCtaLabel: "Register now",
        secondaryCtaLabel: "",
        secondaryCtaUrl: null,
      };
    case "about":
      return {
        title: "About the event",
        body: "",
        imageUrl: null,
        layout: "text",
      };
    case "event-details":
      return {
        title: "Event details",
        showDates: true,
        showVenue: true,
        showTimezone: true,
        customItems: [],
      };
    case "speakers":
      return {
        title: "Speakers",
        layout: "grid",
        items: [],
      };
    case "agenda":
      return {
        title: "Agenda",
        source: "sessions",
        maxSessions: 8,
        manualItems: [],
      };
    case "sponsors":
      return {
        title: "Our sponsors",
        showTiers: ["PLATINUM", "GOLD", "SILVER", "BRONZE"],
      };
    case "venue":
      return {
        title: "Venue",
        address: "",
        mapUrl: null,
        description: "",
        imageUrl: null,
      };
    case "gallery":
      return { title: "Gallery", layout: "grid", images: [] };
    case "registration-cta":
      return {
        title: "Join us",
        subtitle: "",
        ctaType: "public_apply",
        ctaLabel: "Register now",
        externalUrl: null,
      };
    case "contact":
      return {
        title: "Contact",
        email: "",
        phone: "",
        showOrgName: true,
      };
    case "footer":
      return {
        showOrgName: true,
        copyright: "",
        links: [],
      };
    case "statistics":
      return {
        title: "By the numbers",
        items: [
          { value: "500+", label: "Delegates" },
          { value: "40+", label: "Speakers" },
          { value: "30+", label: "Countries" },
        ],
      };
    case "testimonials":
      return { title: "What attendees say", items: [] };
    case "faq":
      return { title: "FAQ", items: [] };
    default:
      return {};
  }
}

export type SectionVariantOption = {
  value: string;
  label: string;
  description: string;
};

export const SECTION_VARIANT_OPTIONS: Partial<
  Record<EventSiteSectionType, SectionVariantOption[]>
> = {
  hero: [
    {
      value: "full",
      label: "Full bleed",
      description: "Immersive background image with overlay and bold headline.",
    },
    {
      value: "split",
      label: "Split",
      description: "Two-column layout with copy and a featured image side by side.",
    },
    {
      value: "compact",
      label: "Compact",
      description: "Centered, minimal hero with essential event details.",
    },
    {
      value: "editorial",
      label: "Editorial",
      description: "Typography-focused layout with refined spacing.",
    },
  ],
  about: [
    {
      value: "text",
      label: "Text only",
      description: "Single column of title and body copy.",
    },
    {
      value: "split",
      label: "Split with image",
      description: "Text alongside an optional image.",
    },
  ],
  speakers: [
    {
      value: "grid",
      label: "Grid",
      description: "Photo cards in a responsive grid.",
    },
  ],
  agenda: [
    {
      value: "list",
      label: "List",
      description: "Stacked session cards with time and details.",
    },
  ],
  gallery: [
    {
      value: "grid",
      label: "Grid",
      description: "Image grid with optional captions.",
    },
  ],
  "registration-cta": [
    {
      value: "banner",
      label: "Banner",
      description: "Full-width accent-colour call-to-action strip.",
    },
  ],
};

export function getSectionVariantOptions(
  type: EventSiteSectionType,
): SectionVariantOption[] {
  return (
    SECTION_VARIANT_OPTIONS[type] ?? [
      {
        value: "default",
        label: "Default",
        description: "Standard layout for this section.",
      },
    ]
  );
}

export function defaultSectionVariant(type: EventSiteSectionType): string {
  switch (type) {
    case "hero":
      return "full";
    case "about":
      return "text";
    case "speakers":
      return "grid";
    case "agenda":
      return "list";
    case "gallery":
      return "grid";
    case "registration-cta":
      return "banner";
    default:
      return "default";
  }
}

export function createSection(
  type: EventSiteSectionType,
  order: number,
  overrides?: Partial<Pick<EventSiteSection, "content" | "variant" | "enabled">>,
): EventSiteSection {
  return {
    id: newSectionId(),
    type,
    order,
    enabled: overrides?.enabled ?? true,
    variant: overrides?.variant ?? defaultSectionVariant(type),
    content: {
      ...defaultSectionContent(type),
      ...(overrides?.content ?? {}),
    },
    settings: {},
  };
}

/** Default section stack for a new site. */
export function defaultSections(): EventSiteSection[] {
  const types: EventSiteSectionType[] = [
    "header",
    "hero",
    "about",
    "event-details",
    "speakers",
    "agenda",
    "registration-cta",
    "footer",
  ];
  return types.map((type, i) => createSection(type, i));
}

export function sortSections(sections: EventSiteSection[]): EventSiteSection[] {
  return [...sections].sort((a, b) => a.order - b.order);
}

export function getSectionByType(
  sections: EventSiteSection[],
  type: EventSiteSectionType,
): EventSiteSection | undefined {
  return sections.find((s) => s.type === type);
}

export function updateSection(
  sections: EventSiteSection[],
  id: string,
  patch: Partial<EventSiteSection> & {
    content?: Record<string, unknown>;
    settings?: Record<string, unknown>;
  },
): EventSiteSection[] {
  return sections.map((s) => {
    if (s.id !== id) return s;
    return {
      ...s,
      ...patch,
      content: patch.content ? { ...s.content, ...patch.content } : s.content,
      settings: patch.settings
        ? { ...s.settings, ...patch.settings }
        : s.settings,
    };
  });
}

export function reorderSections(
  sections: EventSiteSection[],
  fromIndex: number,
  toIndex: number,
): EventSiteSection[] {
  const sorted = sortSections(sections);
  const next = [...sorted];
  const [moved] = next.splice(fromIndex, 1);
  if (!moved) return sections;
  next.splice(toIndex, 0, moved);
  return next.map((s, i) => ({ ...s, order: i }));
}

export function newDefaultSpeaker() {
  return {
    id: newSpeakerId(),
    firstName: "New",
    lastName: "Speaker",
    featured: false,
    order: 0,
    hidden: false,
  };
}

export type EventSiteSponsor = {
  id: string;
  name: string;
  logoUrl: string | null;
  website: string | null;
};

export type EventSiteGalleryImage = {
  id: string;
  url: string;
  caption: string;
  order: number;
};

export function newSponsorId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `spo_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function newGalleryImageId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `gal_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}
