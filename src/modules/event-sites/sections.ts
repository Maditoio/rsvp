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
  "content",
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

export const REPEATABLE_SECTION_TYPES: EventSiteSectionType[] = [
  "gallery",
  "content",
];

export function sectionDisplayLabel(section: EventSiteSection): string {
  if (section.type === "content") {
    const label = String(section.content.label ?? "").trim();
    if (label) return label;
    const title = String(section.content.title ?? "").trim();
    if (title) return title;
  }
  return SECTION_TYPE_LABELS[section.type];
}

export function isSectionTypeAddable(
  type: EventSiteSectionType,
  sections: EventSiteSection[],
): boolean {
  if (REPEATABLE_SECTION_TYPES.includes(type)) return true;
  return !sections.some((section) => section.type === type);
}

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
  content: "Content block",
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
      return {
        showLogo: true,
        sticky: true,
        logoUrl: null,
        imageFit: "contain",
        imagePosition: "center",
        imageRadius: "none",
      };
    case "hero":
      return {
        headline: "",
        subheadline: "",
        eyebrow: "",
        imageUrl: null,
        overlay: "gradient",
        overlayStrength: 100,
        imageFit: "cover",
        imagePosition: "center",
        imageRadius: "none",
        imageWidthMode: "full",
        imageMinHeight: "360px",
        heroMinHeight: "min(72vh, 800px)",
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
        imageFit: "cover",
        imagePosition: "center",
        imageRadius: "none",
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
        imageFit: "cover",
        imagePosition: "center",
        imageRadius: "none",
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
        showTierLabels: true,
        logoGrayscale: true,
        logoSize: "md",
      };
    case "venue":
      return {
        title: "Venue",
        address: "",
        mapUrl: null,
        description: "",
        imageUrl: null,
        imageFit: "cover",
        imagePosition: "center",
        imageRadius: "none",
      };
    case "gallery":
      return {
        title: "Gallery",
        layout: "grid",
        images: [],
        imageFit: "cover",
        imagePosition: "center",
        imageRadius: "none",
      };
    case "content":
      return {
        label: "",
        eyebrow: "",
        title: "",
        subtitle: "",
        body: "",
        imageUrl: null,
        imageFit: "cover",
        imagePosition: "center",
        imageRadius: "none",
        ctaLabel: "",
        ctaUrl: null,
      };
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
      label: "Responsive grid",
      description: "List rows on mobile; photo grid from tablet up.",
    },
    {
      value: "list",
      label: "Speaker list",
      description: "Compact horizontal rows with thumbnail and details.",
    },
    {
      value: "spotlight",
      label: "Spotlight",
      description: "Featured speakers large up top, others in a smaller grid.",
    },
  ],
  sponsors: [
    {
      value: "grouped",
      label: "Grouped by tier",
      description: "Logos arranged in tier blocks with optional category labels.",
    },
    {
      value: "logo-wall",
      label: "Logo wall",
      description: "Flowing logo grid ordered by tier without category headings.",
    },
    {
      value: "cards",
      label: "Logo cards",
      description: "Each logo in a padded card, still ordered by tier.",
    },
    {
      value: "compact",
      label: "Compact strip",
      description: "Smaller logos in tight rows, ideal for many sponsors.",
    },
  ],
  venue: [
    {
      value: "split",
      label: "Split",
      description: "Venue details beside a featured image.",
    },
    {
      value: "stacked",
      label: "Stacked",
      description: "Centered copy with a full-width image below.",
    },
    {
      value: "overlay",
      label: "Image overlay",
      description: "Full-width venue photo with text over a gradient.",
    },
    {
      value: "minimal",
      label: "Minimal",
      description: "Typography-focused layout without a large image.",
    },
  ],
  agenda: [
    {
      value: "list",
      label: "Cards",
      description: "Stacked session cards with time and details.",
    },
    {
      value: "timeline",
      label: "Timeline",
      description: "Vertical timeline with a connector line and time markers.",
    },
    {
      value: "grouped",
      label: "Grouped by day",
      description: "Sessions grouped under day headings, ideal for multi-day agendas.",
    },
    {
      value: "compact",
      label: "Compact schedule",
      description: "Dense rows without cards, best for long session lists.",
    },
  ],
  gallery: [
    {
      value: "grid",
      label: "Grid",
      description: "Image grid with optional captions.",
    },
  ],
  content: [
    {
      value: "text",
      label: "Text only",
      description: "Title and body copy in a single column.",
    },
    {
      value: "split",
      label: "Text with image",
      description: "Copy beside an image on the right.",
    },
    {
      value: "split-left",
      label: "Image with text",
      description: "Image on the left with copy on the right.",
    },
    {
      value: "image",
      label: "Image focus",
      description: "Large image with optional title and caption below.",
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
    case "sponsors":
      return "grouped";
    case "venue":
      return "split";
    case "agenda":
      return "list";
    case "gallery":
      return "grid";
    case "content":
      return "text";
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
