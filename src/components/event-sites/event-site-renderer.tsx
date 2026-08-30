import { cn } from "@/lib/utils";
import { sortSections } from "@/modules/event-sites/sections";
import { eventSiteThemeStyle } from "@/modules/event-sites/theme";
import { getPrimaryCta, type EventSiteConfig } from "@/modules/event-sites/config";
import type { EventSponsorTierGroup } from "@/modules/sponsors/config";
import { renderSiteSection } from "./site-sections";
import type { EventSiteRenderData, EventSiteRendererProps } from "./types";

const PREVIEW_WIDTH: Record<
  NonNullable<EventSiteRendererProps["previewMode"]>,
  string
> = {
  desktop: "100%",
  tablet: "768px",
  mobile: "390px",
};

function coerceDate(value: Date | string | null | undefined): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function buildEventSiteRenderData(input: {
  orgName: string;
  eventName: string;
  venue: string | null;
  startsAt: Date | string | null;
  endsAt: Date | string | null;
  timezone: string;
  logoUrl: string | null;
  config: EventSiteConfig;
  sessions: EventSiteRenderData["sessions"];
  sponsorGroups?: EventSponsorTierGroup[];
  applyUrl: string | null;
  allowPublicApplication: boolean;
  editorMode?: boolean;
}): EventSiteRenderData {
  const cta = getPrimaryCta(input.config);
  let ctaHref: string | null = null;
  let ctaVisible = false;

  if (cta.type === "public_apply" && input.allowPublicApplication && input.applyUrl) {
    ctaHref = input.applyUrl;
    ctaVisible = true;
  } else if (cta.type === "external" && cta.externalUrl) {
    ctaHref = cta.externalUrl;
    ctaVisible = true;
  }

  return {
    orgName: input.orgName,
    eventName: input.eventName,
    venue: input.venue,
    startsAt: coerceDate(input.startsAt),
    endsAt: coerceDate(input.endsAt),
    timezone: input.timezone,
    logoUrl: input.logoUrl,
    config: input.config,
    sessions: input.sessions,
    sponsorGroups: input.sponsorGroups ?? [],
    ctaHref,
    ctaVisible,
    ctaLabel: cta.label,
    editorMode: input.editorMode,
  };
}

export function EventSiteRenderer({
  data,
  previewMode = "desktop",
  selectedSectionId,
  onSelectSection,
  className,
}: EventSiteRendererProps) {
  const themeStyle = eventSiteThemeStyle(
    data.config.theme,
    data.config.globalStyles,
  );
  const editorMode = Boolean(data.editorMode);
  const sections = sortSections(data.config.sections).filter(
    (s) => s.enabled || editorMode,
  );

  return (
    <div
      className={cn("min-h-full", className)}
      style={{
        ...themeStyle,
        width: previewMode !== "desktop" ? PREVIEW_WIDTH[previewMode] : undefined,
        marginInline: previewMode !== "desktop" ? "auto" : undefined,
      }}
    >
      <div
        className={cn(
          previewMode !== "desktop" &&
            "overflow-hidden border-x border-slate-200 shadow-sm",
        )}
      >
        {sections.map((section) =>
          renderSiteSection({
            data,
            sectionId: section.id,
            sectionType: section.type,
            variant: section.variant,
            content: section.content,
            globalStyles: data.config.globalStyles,
            selected: selectedSectionId === section.id,
            onSelect: onSelectSection
              ? () => onSelectSection(section.id)
              : undefined,
            editorMode,
            sectionEnabled: section.enabled,
          }),
        )}
      </div>
    </div>
  );
}
