import type { EventSiteConfig } from "@/modules/event-sites/config";
import type { EventSiteSectionType } from "@/modules/event-sites/sections";
import type { EventSiteSessionPreview } from "@/modules/event-sites/service";
import type { EventSiteGlobalStyles } from "@/modules/event-sites/theme";
import type { EventSponsorTierGroup } from "@/modules/sponsors/config";

export type EventSiteRenderData = {
  orgName: string;
  eventName: string;
  venue: string | null;
  startsAt: Date | string | null;
  endsAt: Date | string | null;
  timezone: string;
  logoUrl: string | null;
  config: EventSiteConfig;
  sessions: EventSiteSessionPreview[];
  sponsorGroups: EventSponsorTierGroup[];
  ctaHref: string | null;
  ctaVisible: boolean;
  ctaLabel: string;
  /** Editor-only placeholders */
  editorMode?: boolean;
};

export type EventSiteRendererProps = {
  data: EventSiteRenderData;
  previewMode?: "desktop" | "tablet" | "mobile";
  selectedSectionId?: string | null;
  onSelectSection?: (id: string) => void;
  className?: string;
};

export type SectionRenderProps = {
  data: EventSiteRenderData;
  sectionId: string;
  sectionType?: EventSiteSectionType;
  variant: string;
  content: Record<string, unknown>;
  globalStyles: EventSiteGlobalStyles;
  selected?: boolean;
  onSelect?: () => void;
  editorMode?: boolean;
};
