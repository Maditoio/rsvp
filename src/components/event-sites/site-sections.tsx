import Link from "next/link";
import { cn, formatEventWindow } from "@/lib/utils";
import { SiteMobileNav } from "./site-mobile-nav";
import {
  speakerDisplayName,
  type EventSiteSpeaker,
} from "@/modules/event-sites/config";
import {
  heroFullMinHeight,
  heroImageObjectStyles,
  heroOverlayOpacity,
  heroSplitImageRadius,
  heroSplitMinHeight,
} from "@/modules/event-sites/hero-image";
import {
  resolveImageDisplay,
  speakerPhotoStyles,
  siteImageStyles,
} from "@/modules/event-sites/site-image";
import type { CSSProperties } from "react";
import {
  alignBoxClass,
  alignJustifyClass,
  getSectionBackgroundValue,
  resolveSectionBackground,
  textAlignClass,
} from "@/modules/event-sites/section-style";
import { parseSponsorSectionTiers, sponsorAltText, type EventSponsorRecord, type EventSponsorTierGroup } from "@/modules/sponsors/config";
import {
  SiteButton,
  SiteContainer,
  SiteHeading,
  SiteSection,
} from "./site-primitives";
import type { EventSiteSectionType } from "@/modules/event-sites/sections";
import type { EventSiteRenderData, SectionRenderProps } from "./types";

function siteLogoUrl(data: EventSiteRenderData): string | null {
  const header = data.config.sections.find((s) => s.type === "header");
  const url = header?.content.logoUrl;
  return typeof url === "string" && url.length > 0 ? url : null;
}

function headerImageDisplay(data: EventSiteRenderData): Record<string, unknown> {
  const header = data.config.sections.find((s) => s.type === "header");
  return (header?.content as Record<string, unknown>) ?? {};
}

type GalleryImageItem = {
  id: string;
  url: string;
  caption: string;
  imageFit?: string;
  imagePosition?: string;
  imageRadius?: string;
};

function SiteImage({
  src,
  alt = "",
  className,
  display,
}: {
  src: string;
  alt?: string;
  className?: string;
  display: Record<string, unknown>;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      className={cn("w-full", className)}
      style={siteImageStyles(display)}
    />
  );
}

function eventDates(
  data: EventSiteRenderData,
  options?: { fallback?: boolean },
): string | null {
  if (!data.startsAt) {
    return options?.fallback ? "Dates TBC" : null;
  }
  const startsAt =
    data.startsAt instanceof Date ? data.startsAt : new Date(data.startsAt);
  const endsAt = data.endsAt
    ? data.endsAt instanceof Date
      ? data.endsAt
      : new Date(data.endsAt)
    : null;
  return formatEventWindow(startsAt, endsAt, data.timezone);
}

function sectionShell(
  props: SectionRenderProps,
  children: React.ReactNode,
  options?: { background?: string; extraClassName?: string },
) {
  const hiddenFromSite = props.editorMode && props.sectionEnabled === false;
  const bg = resolveSectionBackground(props.content, options?.background);
  return (
    <SiteSection
      id={props.sectionId}
      selected={props.selected}
      onSelect={props.onSelect}
      editorMode={props.editorMode}
      className={cn(hiddenFromSite && "opacity-60", bg.className, options?.extraClassName)}
      style={bg.style}
    >
      {hiddenFromSite ? (
        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 bg-slate-900/5 px-4 py-1.5 text-center text-[10px] font-semibold uppercase tracking-wide text-slate-500">
          Hidden from published site
        </div>
      ) : null}
      {children}
    </SiteSection>
  );
}

function heroOverlayStyle(
  overlay: string,
  strength: number,
): { className?: string; style?: React.CSSProperties } {
  return {
    className: cn(
      overlay === "dark" && "bg-black/60",
      overlay === "gradient" &&
        "bg-gradient-to-r from-[var(--site-primary)]/95 via-[var(--site-primary)]/80 to-[var(--site-primary)]/40",
      overlay === "none" && "bg-black/20",
    ),
    style: { opacity: strength },
  };
}

export function HeaderSection(props: SectionRenderProps & { data: EventSiteRenderData }) {
  const { data, content, globalStyles } = props;
  const showLogo = content.showLogo !== false;
  const sticky = content.sticky !== false;
  const logoUrl = siteLogoUrl(data);
  const navStyle = globalStyles.navStyle;
  const isDarkNav = navStyle === "sticky-dark";
  const isTransparentHero =
    navStyle === "transparent" && data.config.templateId === "executive-summit";
  const useLightText = isDarkNav || isTransparentHero;

  const navLinks = [
    { label: "About", href: "#about" },
    { label: "Speakers", href: "#speakers" },
    { label: "Agenda", href: "#agenda" },
  ].filter((link) =>
    data.config.sections.some(
      (s) => s.enabled && s.type === link.label.toLowerCase().replace(" ", "-"),
    ),
  );

  return (
    <header
      className={cn(
        "z-40 w-full",
        sticky && "sticky top-0",
        navStyle === "transparent" && "absolute inset-x-0 top-0 bg-transparent",
        navStyle === "solid" && "border-b border-slate-200 bg-white shadow-sm",
        navStyle === "sticky-light" && "border-b border-slate-200/80 bg-white/95 backdrop-blur-md",
        navStyle === "sticky-dark" && "bg-[var(--site-primary)] text-white",
        isTransparentHero && "text-white",
      )}
    >
      <SiteContainer className="flex h-16 items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          {showLogo && logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoUrl}
              alt=""
              className="h-9 w-auto max-w-[140px]"
              style={siteImageStyles(headerImageDisplay(data))}
            />
          ) : (
            <span
              className={cn(
                "truncate text-sm font-semibold",
                useLightText ? "text-white" : "text-[var(--site-primary)]",
              )}
              style={{ fontFamily: "var(--site-heading-font)" }}
            >
              {data.eventName}
            </span>
          )}
        </div>
        <nav className="hidden items-center gap-6 md:flex">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className={cn(
                "text-sm font-medium transition hover:opacity-80",
                useLightText ? "text-white/90" : "text-[var(--site-secondary)]",
              )}
            >
              {link.label}
            </a>
          ))}
          {data.ctaVisible && data.ctaHref ? (
            <SiteButton
              label={data.ctaLabel}
              href={data.ctaHref}
              accent={data.config.theme.accentColor}
              style={globalStyles.buttonStyle}
              radius={globalStyles.borderRadius}
              className="!h-9 !px-4 !text-xs"
            />
          ) : null}
        </nav>
        <SiteMobileNav
          data={data}
          links={navLinks}
          isDark={useLightText}
          globalStyles={globalStyles}
        />
      </SiteContainer>
    </header>
  );
}

export function HeroSection(props: SectionRenderProps & { data: EventSiteRenderData }) {
  const { data, content, variant, globalStyles } = props;
  const headline = String(content.headline || data.eventName);
  const subheadline = String(content.subheadline ?? "");
  const eyebrow = String(content.eyebrow ?? data.orgName);
  const imageUrl = (content.imageUrl as string | null) || null;
  const headerLogo = siteLogoUrl(data);
  const showDates = content.showDates !== false;
  const showVenue = content.showVenue !== false;
  const dates = showDates ? eventDates(data) : null;
  const overlay = String(content.overlay ?? "gradient");
  const overlayStrength = heroOverlayOpacity(content);
  const overlayLayer = heroOverlayStyle(overlay, overlayStrength);
  const imageStyles = heroImageObjectStyles(content);
  const primaryLabel = String(content.primaryCtaLabel ?? data.ctaLabel);
  const secondaryLabel = String(content.secondaryCtaLabel ?? "");
  const secondaryUrl = content.secondaryCtaUrl as string | null;

  if (variant === "split") {
    const splitRadius = heroSplitImageRadius(content);
    const splitMinHeight = heroSplitMinHeight(content);
    const widthMode = content.imageWidthMode === "inset" ? "inset" : "full";

    return sectionShell(
      props,
      <SiteContainer>
        <div className="grid items-center gap-10 md:grid-cols-2 md:gap-12">
          <div className={textAlignClass(content, "left")}>
            <p
              className="text-xs font-semibold uppercase tracking-[0.18em]"
              style={{ color: "var(--site-accent)" }}
            >
              {eyebrow}
            </p>
            <SiteHeading as="h1" className="mt-3">
              {headline}
            </SiteHeading>
            {subheadline ? (
              <p className="mt-4 text-lg leading-relaxed">{subheadline}</p>
            ) : null}
            <div className="mt-4 text-sm opacity-80">
              {dates}
              {showVenue && data.venue ? (
                <span>{dates ? " · " : ""}{data.venue}</span>
              ) : null}
            </div>
            <div className={cn("mt-8 flex flex-wrap gap-3", alignJustifyClass(content, "left"))}>
              {data.ctaVisible && data.ctaHref ? (
                <SiteButton
                  label={primaryLabel}
                  href={data.ctaHref}
                  accent={data.config.theme.accentColor}
                  style={globalStyles.buttonStyle}
                  radius={globalStyles.borderRadius}
                />
              ) : null}
              {secondaryLabel && secondaryUrl ? (
                <SiteButton
                  label={secondaryLabel}
                  href={secondaryUrl}
                  accent={data.config.theme.accentColor}
                  style="outline"
                  radius={globalStyles.borderRadius}
                />
              ) : null}
            </div>
          </div>
          <div
            className={cn(
              "overflow-hidden",
              widthMode === "inset" && "p-4 md:p-6",
            )}
          >
            <div
              className={cn(
                "overflow-hidden",
                widthMode === "full" && "shadow-lg",
              )}
              style={{ borderRadius: splitRadius }}
            >
              {imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={imageUrl}
                  alt=""
                  className="w-full"
                  style={{
                    ...imageStyles,
                    minHeight: splitMinHeight,
                    height: splitMinHeight ? splitMinHeight : undefined,
                    aspectRatio: splitMinHeight ? undefined : "4 / 3",
                  }}
                />
              ) : (
                <div
                  className="flex items-center justify-center text-white/70"
                  style={{
                    backgroundColor: "var(--site-primary)",
                    minHeight: splitMinHeight ?? "16rem",
                    aspectRatio: splitMinHeight ? undefined : "4 / 3",
                  }}
                >
                  {props.editorMode ? "Add hero image" : null}
                </div>
              )}
            </div>
          </div>
        </div>
      </SiteContainer>,
    );
  }

  if (variant === "compact") {
    return sectionShell(
      props,
      <SiteContainer className={textAlignClass(content, "center")}>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] opacity-60">
          {eyebrow}
        </p>
        <SiteHeading as="h1" className="mt-3">
          {headline}
        </SiteHeading>
        {dates ? <p className="mt-3 text-sm opacity-70">{dates}</p> : null}
        {subheadline ? <p className="mx-auto mt-4 max-w-xl">{subheadline}</p> : null}
        {data.ctaVisible && data.ctaHref ? (
          <div className={cn("mt-8 flex", alignJustifyClass(content, "center"))}>
            <SiteButton
              label={primaryLabel}
              href={data.ctaHref}
              accent={data.config.theme.accentColor}
              style={globalStyles.buttonStyle}
              radius={globalStyles.borderRadius}
            />
          </div>
        ) : null}
      </SiteContainer>,
      { extraClassName: "border-b border-slate-100" },
    );
  }

  if (variant === "editorial") {
    return sectionShell(
      props,
      <SiteContainer>
        <div className={cn("mx-auto max-w-3xl", textAlignClass(content, "center"))}>
          <p className="text-sm font-medium tracking-wide opacity-70">{eyebrow}</p>
          <SiteHeading as="h1" className="mt-4">
            {headline}
          </SiteHeading>
          {subheadline ? (
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed opacity-90">
              {subheadline}
            </p>
          ) : null}
          <div className="mt-6 text-sm opacity-70">
            {dates}
            {showVenue && data.venue ? (
              <span>{dates ? " · " : ""}{data.venue}</span>
            ) : null}
          </div>
        </div>
      </SiteContainer>,
      {
        background: "bg-gradient-to-b from-amber-50/50 to-transparent",
        extraClassName: "border-b border-amber-100/60",
      },
    );
  }

  return sectionShell(
    props,
    <div
      className="relative overflow-hidden text-white"
      style={{
        backgroundColor: "var(--site-primary)",
        minHeight: heroFullMinHeight(content),
      }}
    >
      {imageUrl ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl}
            alt=""
            className="absolute inset-0 size-full"
            style={imageStyles}
          />
          <div
            className={cn("absolute inset-0", overlayLayer.className)}
            style={overlayLayer.style}
            aria-hidden
          />
        </>
      ) : null}
      <SiteContainer className={cn("relative py-20 md:py-28", textAlignClass(content, "left"))}>
        {content.showLogo !== false && headerLogo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={headerLogo}
            alt=""
            className="mb-6 h-12 w-auto object-contain"
          />
        ) : null}
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/70">
          {eyebrow}
        </p>
        <h1
          className={cn(
            "mt-3 max-w-4xl text-4xl font-semibold tracking-tight text-white md:text-5xl lg:text-6xl",
            alignBoxClass(content, "left"),
          )}
          style={{ fontFamily: "var(--site-heading-font)" }}
        >
          {headline}
        </h1>
        {subheadline ? (
          <p className={cn("mt-4 max-w-2xl text-lg text-white/85", alignBoxClass(content, "left"))}>
            {subheadline}
          </p>
        ) : null}
        <div className="mt-6 flex flex-wrap items-center gap-4 text-sm text-white/80">
          {dates ? <span>{dates}</span> : null}
          {showVenue && data.venue ? (
            <span>{dates ? "· " : ""}{data.venue}</span>
          ) : null}
        </div>
        <div className={cn("mt-8 flex flex-wrap gap-3", alignJustifyClass(content, "left"))}>
          {data.ctaVisible && data.ctaHref ? (
            <SiteButton
              label={primaryLabel}
              href={data.ctaHref}
              accent={data.config.theme.accentColor}
              style={globalStyles.buttonStyle}
              radius={globalStyles.borderRadius}
            />
          ) : null}
          {secondaryLabel && secondaryUrl ? (
            <SiteButton
              label={secondaryLabel}
              href={secondaryUrl}
              accent={data.config.theme.accentColor}
              style="outline"
              radius={globalStyles.borderRadius}
              inverted
            />
          ) : null}
        </div>
      </SiteContainer>
    </div>,
    { extraClassName: "!py-0" },
  );
}

export function AboutSection(props: SectionRenderProps & { data: EventSiteRenderData }) {
  const { content, variant } = props;
  const title = String(content.title ?? "About the event");
  const body = String(content.body ?? "");
  if (!body.trim()) return props.editorMode ? sectionShell(props, <SiteContainer><SiteHeading>{title}</SiteHeading><p className="mt-4 opacity-50">Add about content in the editor.</p></SiteContainer>) : null;

  if (variant === "split") {
    const imageUrl = content.imageUrl ? String(content.imageUrl) : null;
    return sectionShell(
      props,
      <SiteContainer id="about">
        <div className="grid items-center gap-10 md:grid-cols-2">
          <div className={textAlignClass(content, "left")}>
            <SiteHeading>{title}</SiteHeading>
            <p className="mt-4 whitespace-pre-wrap leading-relaxed">{body}</p>
          </div>
          {imageUrl ? (
            <SiteImage
              src={imageUrl}
              display={content}
              className="aspect-[4/3]"
            />
          ) : props.editorMode ? (
            <div
              className="flex aspect-[4/3] items-center justify-center bg-slate-100 text-sm text-slate-500"
            >
              Upload an image in the section editor
            </div>
          ) : null}
        </div>
      </SiteContainer>,
    );
  }

  return sectionShell(
    props,
    <SiteContainer id="about">
      <div className={textAlignClass(content, "left")}>
        <SiteHeading>{title}</SiteHeading>
        <p className="mt-4 max-w-3xl whitespace-pre-wrap leading-relaxed">{body}</p>
      </div>
    </SiteContainer>,
  );
}

function contentHasBody(content: Record<string, unknown>) {
  return Boolean(
    String(content.eyebrow ?? "").trim() ||
      String(content.title ?? "").trim() ||
      String(content.subtitle ?? "").trim() ||
      String(content.body ?? "").trim() ||
      content.imageUrl,
  );
}

function ContentTextBlock({
  content,
  align = "left",
}: {
  content: Record<string, unknown>;
  align?: "left" | "center" | "right";
}) {
  const eyebrow = String(content.eyebrow ?? "").trim();
  const title = String(content.title ?? "").trim();
  const subtitle = String(content.subtitle ?? "").trim();
  const body = String(content.body ?? "");
  const ctaLabel = String(content.ctaLabel ?? "").trim();
  const ctaUrl = String(content.ctaUrl ?? "").trim();

  return (
    <div className={textAlignClass(content, align)}>
      {eyebrow ? (
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--site-accent)]">
          {eyebrow}
        </p>
      ) : null}
      {title ? <SiteHeading className={eyebrow ? "mt-2" : undefined}>{title}</SiteHeading> : null}
      {subtitle ? (
        <p className="mt-3 text-lg leading-relaxed opacity-80">{subtitle}</p>
      ) : null}
      {body ? (
        <p className="mt-4 whitespace-pre-wrap leading-relaxed">{body}</p>
      ) : null}
      {ctaLabel && ctaUrl ? (
        <div className={cn("mt-6 flex", alignJustifyClass(content, align))}>
          <SiteButton
            label={ctaLabel}
            href={ctaUrl}
            accent="var(--site-accent)"
            style="solid"
            radius="full"
          />
        </div>
      ) : null}
    </div>
  );
}

export function ContentSection(props: SectionRenderProps & { data: EventSiteRenderData }) {
  const { content, variant, editorMode } = props;
  const hasContent = contentHasBody(content);
  if (!hasContent && !editorMode) return null;

  const imageUrl = content.imageUrl ? String(content.imageUrl) : null;
  const placeholder = (
    <div className="flex aspect-[4/3] items-center justify-center bg-slate-100 text-sm text-slate-500">
      Upload an image in the section editor
    </div>
  );

  if (variant === "image") {
    return sectionShell(
      props,
      <SiteContainer>
        {imageUrl ? (
          <SiteImage src={imageUrl} display={content} className="aspect-[21/9] w-full" />
        ) : editorMode ? (
          placeholder
        ) : null}
        {hasContent ? (
          <div className="mt-8">
            <ContentTextBlock content={content} align="left" />
          </div>
        ) : editorMode ? (
          <p className="mt-4 text-sm opacity-50">Add a title, body, or image in the editor.</p>
        ) : null}
      </SiteContainer>,
    );
  }

  if (variant === "split" || variant === "split-left") {
    const imageFirst = variant === "split-left";
    return sectionShell(
      props,
      <SiteContainer>
        <div className="grid items-center gap-10 md:grid-cols-2">
          {imageFirst ? (
            imageUrl ? (
              <SiteImage src={imageUrl} display={content} className="aspect-[4/3]" />
            ) : editorMode ? (
              placeholder
            ) : null
          ) : null}
          {hasContent ? (
            <ContentTextBlock content={content} align="left" />
          ) : editorMode ? (
            <p className="text-sm opacity-50">Add title and body copy in the editor.</p>
          ) : null}
          {!imageFirst ? (
            imageUrl ? (
              <SiteImage src={imageUrl} display={content} className="aspect-[4/3]" />
            ) : editorMode ? (
              placeholder
            ) : null
          ) : null}
        </div>
      </SiteContainer>,
    );
  }

  return sectionShell(
    props,
    <SiteContainer>
      {hasContent ? (
        <ContentTextBlock content={content} align="left" />
      ) : (
        <p className="text-sm opacity-50">Add title and body copy in the editor.</p>
      )}
    </SiteContainer>,
  );
}

export function EventDetailsSection(props: SectionRenderProps & { data: EventSiteRenderData }) {
  const { data, content, editorMode } = props;
  const title = String(content.title ?? "Event details");
  const dates =
    content.showDates !== false
      ? eventDates(data, { fallback: editorMode })
      : null;
  const showVenue = content.showVenue !== false;
  const showTimezone = content.showTimezone !== false;
  const hasCards =
    Boolean(dates) ||
    (showVenue && Boolean(data.venue)) ||
    (showTimezone && Boolean(data.timezone));

  return sectionShell(
    props,
    <SiteContainer>
      <SiteHeading className={textAlignClass(content, "left")}>{title}</SiteHeading>
      {hasCards ? (
        <dl className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {dates ? (
            <div
              className="rounded-xl bg-white p-5 shadow-sm"
              style={{ borderRadius: "var(--site-radius)" }}
            >
              <dt className="text-xs font-semibold uppercase tracking-wide opacity-60">Dates</dt>
              <dd className="mt-1 font-medium text-[var(--site-primary)]">{dates}</dd>
            </div>
          ) : null}
          {showVenue && data.venue ? (
            <div
              className="rounded-xl bg-white p-5 shadow-sm"
              style={{ borderRadius: "var(--site-radius)" }}
            >
              <dt className="text-xs font-semibold uppercase tracking-wide opacity-60">Venue</dt>
              <dd className="mt-1 font-medium text-[var(--site-primary)]">{data.venue}</dd>
            </div>
          ) : null}
          {showTimezone && data.timezone ? (
            <div
              className="rounded-xl bg-white p-5 shadow-sm"
              style={{ borderRadius: "var(--site-radius)" }}
            >
              <dt className="text-xs font-semibold uppercase tracking-wide opacity-60">Timezone</dt>
              <dd className="mt-1 font-medium text-[var(--site-primary)]">{data.timezone}</dd>
            </div>
          ) : null}
        </dl>
      ) : editorMode ? (
        <p className="mt-4 text-sm opacity-50">
          Event dates, venue, and timezone appear here from your event settings.
        </p>
      ) : null}
    </SiteContainer>,
    { background: "bg-slate-50/80" },
  );
}

function speakerPlaceholder(): EventSiteSpeaker {
  return {
    id: "placeholder",
    firstName: "Add",
    lastName: "speaker",
    order: 0,
    featured: false,
    hidden: false,
  };
}

function resolveSpeakers(
  content: Record<string, unknown>,
  editorMode?: boolean,
): EventSiteSpeaker[] {
  const allItems = (content.items as EventSiteSpeaker[]) ?? [];
  const visibleItems = allItems.filter((s) => !s.hidden);
  const displayItems = editorMode ? allItems : visibleItems;
  if (displayItems.length) return displayItems;
  return editorMode ? [speakerPlaceholder()] : [];
}

function sortSpeakers(speakers: EventSiteSpeaker[]): EventSiteSpeaker[] {
  return [...speakers].sort((a, b) => a.order - b.order);
}

function speakerSubtitle(speaker: EventSiteSpeaker): string | null {
  const line = [speaker.jobTitle, speaker.organization].filter(Boolean).join(" · ");
  return line || null;
}

function SpeakerPhoto({
  speaker,
  editorMode,
  className,
  display,
}: {
  speaker: EventSiteSpeaker;
  editorMode?: boolean;
  className?: string;
  display: Record<string, unknown>;
}) {
  const imageStyles = speakerPhotoStyles(display);
  const alt = speakerDisplayName(speaker);

  if (speaker.photoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={speaker.photoUrl}
        alt={alt}
        className={cn("w-full", className)}
        style={imageStyles}
      />
    );
  }

  return (
    <div
      className={cn(
        "flex w-full items-center justify-center text-sm font-medium text-white",
        className,
      )}
      style={{ ...imageStyles, backgroundColor: "var(--site-accent)" }}
      aria-label={alt}
    >
      {editorMode ? "Photo" : alt.slice(0, 1).toUpperCase()}
    </div>
  );
}

function SpeakerName({ speaker }: { speaker: EventSiteSpeaker }) {
  return (
    <p
      className="font-semibold text-[var(--site-primary)]"
      style={{ fontFamily: "var(--site-heading-font)" }}
    >
      {speakerDisplayName(speaker)}
    </p>
  );
}

function SpeakerDetails({
  speaker,
  bioLines = 3,
  compact = false,
}: {
  speaker: EventSiteSpeaker;
  bioLines?: 2 | 3 | "none";
  compact?: boolean;
}) {
  return (
    <>
      <SpeakerName speaker={speaker} />
      {speakerSubtitle(speaker) ? (
        <p className={cn("mt-1 text-sm opacity-70", compact && "text-xs")}>
          {speakerSubtitle(speaker)}
        </p>
      ) : null}
      {speaker.bio && bioLines !== "none" ? (
        <p
          className={cn(
            "mt-2 text-sm leading-relaxed",
            bioLines === 2 && "line-clamp-2",
            bioLines === 3 && "line-clamp-3",
          )}
        >
          {speaker.bio}
        </p>
      ) : null}
    </>
  );
}

function SpeakerRow({
  speaker,
  editorMode,
  imageDisplay,
  bioLines = 2,
}: {
  speaker: EventSiteSpeaker;
  editorMode?: boolean;
  imageDisplay: Record<string, unknown>;
  bioLines?: 2 | 3;
}) {
  return (
    <li
      className={cn(
        "flex gap-4 py-5 sm:gap-5 sm:items-start",
        editorMode && speaker.hidden && "opacity-50",
      )}
    >
      <SpeakerPhoto
        speaker={speaker}
        editorMode={editorMode}
        display={imageDisplay}
        className="size-20 shrink-0 sm:size-24"
      />
      <div className="min-w-0 flex-1">
        <SpeakerDetails speaker={speaker} bioLines={bioLines} />
      </div>
    </li>
  );
}

function SpeakersListLayout({
  speakers,
  editorMode,
  imageDisplay,
}: {
  speakers: EventSiteSpeaker[];
  editorMode?: boolean;
  imageDisplay: Record<string, unknown>;
}) {
  return (
    <ul className="mt-10 divide-y divide-slate-200/80">
      {speakers.map((speaker) => (
        <SpeakerRow
          key={speaker.id}
          speaker={speaker}
          editorMode={editorMode}
          imageDisplay={imageDisplay}
          bioLines={2}
        />
      ))}
    </ul>
  );
}

/** Mobile list + desktop multi-column grid (default). */
function SpeakersResponsiveGridLayout({
  speakers,
  editorMode,
  imageDisplay,
}: {
  speakers: EventSiteSpeaker[];
  editorMode?: boolean;
  imageDisplay: Record<string, unknown>;
}) {
  return (
    <>
      <ul className="mt-10 divide-y divide-slate-200/80 md:hidden">
        {speakers.map((speaker) => (
          <SpeakerRow
            key={speaker.id}
            speaker={speaker}
            editorMode={editorMode}
            imageDisplay={imageDisplay}
            bioLines={2}
          />
        ))}
      </ul>
      <ul className="mt-10 hidden gap-x-8 gap-y-10 md:grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {speakers.map((speaker) => (
          <li
            key={speaker.id}
            className={cn(editorMode && speaker.hidden && "opacity-50")}
          >
            <SpeakerPhoto
              speaker={speaker}
              editorMode={editorMode}
              display={imageDisplay}
              className="aspect-[3/4] max-h-80 w-full"
            />
            <div className="pt-4">
              <SpeakerDetails speaker={speaker} bioLines={3} />
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}

function SpeakersSpotlightLayout({
  speakers,
  editorMode,
  imageDisplay,
}: {
  speakers: EventSiteSpeaker[];
  editorMode?: boolean;
  imageDisplay: Record<string, unknown>;
}) {
  const featured = speakers.filter((s) => s.featured);
  const regular = speakers.filter((s) => !s.featured);
  const spotlight = featured.length > 0 ? featured : speakers.slice(0, 2);
  const remainder =
    featured.length > 0 ? regular : speakers.slice(spotlight.length);

  return (
    <div className="mt-10 space-y-10">
      <ul className="space-y-10">
        {spotlight.map((speaker) => (
          <li
            key={speaker.id}
            className={cn(
              "flex flex-col gap-5 lg:flex-row lg:items-start lg:gap-8",
              editorMode && speaker.hidden && "opacity-50",
            )}
          >
            <SpeakerPhoto
              speaker={speaker}
              editorMode={editorMode}
              display={imageDisplay}
              className="aspect-[4/3] w-full max-h-72 shrink-0 lg:aspect-[3/4] lg:h-auto lg:max-h-80 lg:w-44"
            />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[var(--site-accent)]">
                Featured
              </p>
              <div className="mt-2">
                <SpeakerDetails speaker={speaker} bioLines="none" />
              </div>
              {speaker.bio ? (
                <p className="mt-3 text-sm leading-relaxed">{speaker.bio}</p>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
      {remainder.length > 0 ? (
        <ul className="divide-y divide-slate-200/80 border-t border-slate-200/80">
          {remainder.map((speaker) => (
            <SpeakerRow
              key={speaker.id}
              speaker={speaker}
              editorMode={editorMode}
              imageDisplay={imageDisplay}
              bioLines={2}
            />
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function sponsorPlaceholder(tier: EventSponsorTierGroup["tier"]): EventSponsorRecord {
  return {
    id: `placeholder-${tier}`,
    name: "Sponsor logo",
    logoUrl: null,
    websiteUrl: null,
    sortOrder: 0,
    tier,
  };
}

function resolveSponsorTiers(
  props: SectionRenderProps & { data: EventSiteRenderData },
): EventSponsorTierGroup[] {
  const showTiers = parseSponsorSectionTiers(props.content.showTiers);
  return props.data.sponsorGroups.filter((group) => showTiers.includes(group.tier));
}

function SponsorLogo({
  sponsor,
  size = "default",
  inCard = false,
}: {
  sponsor: EventSponsorRecord;
  size?: "default" | "compact";
  inCard?: boolean;
}) {
  const alt = sponsorAltText(sponsor);
  const imgClass = cn(
    "object-contain opacity-80 grayscale transition hover:opacity-100 hover:grayscale-0",
    size === "compact" ? "h-8 max-w-[120px]" : "h-12 max-w-[160px]",
  );
  const content = sponsor.logoUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={sponsor.logoUrl} alt={alt} className={imgClass} />
  ) : (
    <span className="text-sm opacity-40">{alt}</span>
  );

  const wrapped = inCard ? (
    <div
      className="flex h-24 w-40 items-center justify-center bg-white px-4 shadow-sm"
      style={{ borderRadius: "var(--site-radius)" }}
    >
      {content}
    </div>
  ) : (
    content
  );

  if (sponsor.logoUrl && sponsor.websiteUrl) {
    return (
      <a
        href={sponsor.websiteUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="block"
        title={alt}
      >
        {wrapped}
      </a>
    );
  }

  return wrapped;
}

function SponsorTierBlock({
  tier,
  sponsors,
  showTierLabels,
  variant,
  editorMode,
}: {
  tier: EventSponsorTierGroup;
  sponsors: EventSponsorRecord[];
  showTierLabels: boolean;
  variant: "grouped" | "logo-wall" | "cards" | "compact";
  editorMode?: boolean;
}) {
  const items =
    sponsors.length > 0
      ? sponsors
      : editorMode
        ? [sponsorPlaceholder(tier.tier)]
        : [];

  if (items.length === 0) return null;

  const listClass =
    variant === "compact"
      ? "mt-3 flex flex-wrap items-center justify-center gap-4"
      : variant === "cards"
        ? "mt-4 flex flex-wrap items-center justify-center gap-5"
        : "mt-4 flex flex-wrap items-center justify-center gap-8";

  return (
    <div
      className={cn(
        variant === "logo-wall" && "border-t border-slate-200/70 pt-8 first:border-t-0 first:pt-0",
      )}
    >
      {showTierLabels && variant !== "logo-wall" ? (
        <p className="text-center text-xs font-semibold uppercase tracking-[0.15em] opacity-50">
          {tier.label}
        </p>
      ) : null}
      <ul className={listClass}>
        {items.map((s) => (
          <li key={s.id}>
            <SponsorLogo
              sponsor={s}
              size={variant === "compact" ? "compact" : "default"}
              inCard={variant === "cards"}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}

export function SpeakersSection(props: SectionRenderProps & { data: EventSiteRenderData }) {
  const { content, editorMode, variant } = props;
  const title = String(content.title ?? "Speakers");
  const speakers = sortSpeakers(resolveSpeakers(content, editorMode));
  const layout =
    variant === "default" || variant === "cards" ? "grid" : variant;
  const imageDisplay = content as Record<string, unknown>;

  if (speakers.length === 0 && !editorMode) return null;

  return sectionShell(
    props,
    <SiteContainer id="speakers">
      <SiteHeading className={textAlignClass(content, "left")}>{title}</SiteHeading>
      {layout === "list" ? (
        <SpeakersListLayout speakers={speakers} editorMode={editorMode} imageDisplay={imageDisplay} />
      ) : layout === "spotlight" ? (
        <SpeakersSpotlightLayout speakers={speakers} editorMode={editorMode} imageDisplay={imageDisplay} />
      ) : (
        <SpeakersResponsiveGridLayout speakers={speakers} editorMode={editorMode} imageDisplay={imageDisplay} />
      )}
    </SiteContainer>,
  );
}

type AgendaSessionItem = EventSiteRenderData["sessions"][number];

function agendaPlaceholderSession(): AgendaSessionItem {
  return {
    id: "placeholder",
    title: "Sessions appear from your event agenda",
    description: null,
    location: null,
    dateLabel: "",
    timeLabel: null,
  };
}

function resolveAgendaSessions(
  data: EventSiteRenderData,
  editorMode?: boolean,
): AgendaSessionItem[] {
  if (data.sessions.length) return data.sessions;
  return editorMode ? [agendaPlaceholderSession()] : [];
}

function AgendaListLayout({ sessions }: { sessions: AgendaSessionItem[] }) {
  return (
    <ul className="mt-8 space-y-3">
      {sessions.map((session) => (
        <li
          key={session.id}
          className="bg-white p-5 shadow-sm"
          style={{ borderRadius: "var(--site-radius)" }}
        >
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3
              className="font-semibold text-[var(--site-primary)]"
              style={{ fontFamily: "var(--site-heading-font)" }}
            >
              {session.title}
            </h3>
            {session.timeLabel ? (
              <span className="text-sm opacity-60">{session.timeLabel}</span>
            ) : null}
          </div>
          {session.location ? (
            <p className="mt-1 text-sm opacity-60">{session.location}</p>
          ) : null}
          {session.description ? (
            <p className="mt-2 line-clamp-2 text-sm">{session.description}</p>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

function AgendaTimelineLayout({ sessions }: { sessions: AgendaSessionItem[] }) {
  return (
    <ol className="mt-10 border-l border-slate-200 pl-6">
      {sessions.map((session) => (
        <li key={session.id} className="relative pb-8 last:pb-0">
          <span
            className="absolute -left-[29px] top-1 size-3 rounded-full border-2 border-white shadow-sm"
            style={{ backgroundColor: "var(--site-accent)" }}
            aria-hidden
          />
          {session.timeLabel ? (
            <p className="text-xs font-semibold uppercase tracking-wide opacity-60">
              {session.timeLabel}
            </p>
          ) : null}
          <h3
            className="mt-1 font-semibold text-[var(--site-primary)]"
            style={{ fontFamily: "var(--site-heading-font)" }}
          >
            {session.title}
          </h3>
          {session.location ? (
            <p className="mt-1 text-sm opacity-60">{session.location}</p>
          ) : null}
          {session.description ? (
            <p className="mt-2 text-sm leading-relaxed">{session.description}</p>
          ) : null}
        </li>
      ))}
    </ol>
  );
}

function groupAgendaSessionsByDate(
  sessions: AgendaSessionItem[],
): { dateLabel: string; sessions: AgendaSessionItem[] }[] {
  const groups: { dateLabel: string; sessions: AgendaSessionItem[] }[] = [];
  for (const session of sessions) {
    const label = session.dateLabel || "Schedule";
    const existing = groups.find((g) => g.dateLabel === label);
    if (existing) existing.sessions.push(session);
    else groups.push({ dateLabel: label, sessions: [session] });
  }
  return groups;
}

function AgendaGroupedLayout({ sessions }: { sessions: AgendaSessionItem[] }) {
  const groups = groupAgendaSessionsByDate(sessions);
  return (
    <div className="mt-8 space-y-8">
      {groups.map((group) => (
        <div key={group.dateLabel}>
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[var(--site-accent)]">
            {group.dateLabel}
          </p>
          <ul className="mt-3 divide-y divide-slate-200/80 border-t border-slate-200/80">
            {group.sessions.map((session) => (
              <li
                key={session.id}
                className="flex flex-wrap items-baseline justify-between gap-2 py-4"
              >
                <div className="min-w-0">
                  <h3
                    className="font-semibold text-[var(--site-primary)]"
                    style={{ fontFamily: "var(--site-heading-font)" }}
                  >
                    {session.title}
                  </h3>
                  {session.location ? (
                    <p className="mt-1 text-sm opacity-60">{session.location}</p>
                  ) : null}
                  {session.description ? (
                    <p className="mt-1 text-sm leading-relaxed">{session.description}</p>
                  ) : null}
                </div>
                {session.timeLabel ? (
                  <span className="shrink-0 text-sm font-medium opacity-70">
                    {session.timeLabel}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

function AgendaCompactLayout({ sessions }: { sessions: AgendaSessionItem[] }) {
  return (
    <ul className="mt-8 divide-y divide-slate-200/80">
      {sessions.map((session) => (
        <li key={session.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
          <div className="flex min-w-0 items-baseline gap-3">
            {session.timeLabel ? (
              <span className="w-20 shrink-0 text-xs font-semibold uppercase tracking-wide opacity-60">
                {session.timeLabel}
              </span>
            ) : null}
            <span className="truncate font-medium text-[var(--site-primary)]">
              {session.title}
            </span>
          </div>
          {session.location ? (
            <span className="shrink-0 text-xs opacity-60">{session.location}</span>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

export function AgendaSection(props: SectionRenderProps & { data: EventSiteRenderData }) {
  const { data, content, variant, editorMode } = props;
  const title = String(content.title ?? "Agenda");
  const sessions = resolveAgendaSessions(data, editorMode);
  if (sessions.length === 0 && !editorMode) return null;

  return sectionShell(
    props,
    <SiteContainer id="agenda">
      <SiteHeading className={textAlignClass(content, "left")}>{title}</SiteHeading>
      {variant === "timeline" ? (
        <AgendaTimelineLayout sessions={sessions} />
      ) : variant === "grouped" ? (
        <AgendaGroupedLayout sessions={sessions} />
      ) : variant === "compact" ? (
        <AgendaCompactLayout sessions={sessions} />
      ) : (
        <AgendaListLayout sessions={sessions} />
      )}
    </SiteContainer>,
    { background: "bg-slate-50/80" },
  );
}

export function SponsorsSection(props: SectionRenderProps & { data: EventSiteRenderData }) {
  const title = String(props.content.title ?? "Our sponsors");
  const showTierLabels = props.content.showTierLabels !== false;
  const tiers = resolveSponsorTiers(props);
  const layout = props.variant === "default" ? "grouped" : props.variant;
  const sponsorVariant =
    layout === "logo-wall" ||
    layout === "cards" ||
    layout === "compact"
      ? layout
      : "grouped";
  const hasSponsors = tiers.some((t) => t.sponsors.length > 0);
  if (!hasSponsors && !props.editorMode) return null;

  return sectionShell(
    props,
    <SiteContainer>
      <SiteHeading className={textAlignClass(props.content, "left")}>{title}</SiteHeading>
      <div className={cn("mt-10", sponsorVariant === "grouped" ? "space-y-10" : "space-y-0")}>
        {tiers.map((tier) => (
          <SponsorTierBlock
            key={tier.tier}
            tier={tier}
            sponsors={tier.sponsors}
            showTierLabels={showTierLabels}
            variant={sponsorVariant}
            editorMode={props.editorMode}
          />
        ))}
      </div>
    </SiteContainer>,
  );
}

export function VenueSection(props: SectionRenderProps & { data: EventSiteRenderData }) {
  const { content, data, variant } = props;
  const title = String(content.title ?? "Venue");
  const address = String(content.address || data.venue || "");
  const description = content.description ? String(content.description) : "";
  const imageUrl = content.imageUrl ? String(content.imageUrl) : null;
  const layout = variant === "default" ? "split" : variant;

  if (!address && !description && !imageUrl && !props.editorMode) return null;

  const centeredByDefault = layout === "stacked" || layout === "minimal";
  const details = (
    <div className={textAlignClass(content, centeredByDefault ? "center" : "left")}>
      <SiteHeading>{title}</SiteHeading>
      {address ? <p className="mt-4 text-lg">{address}</p> : null}
      {description ? (
        <p className="mt-3 text-sm leading-relaxed">{description}</p>
      ) : null}
    </div>
  );

  if (layout === "stacked") {
    return sectionShell(
      props,
      <SiteContainer>
        <div className="mx-auto max-w-2xl">{details}</div>
        {imageUrl ? (
          <SiteImage
            src={imageUrl}
            display={content}
            className="mt-10 aspect-[16/9] shadow-sm"
          />
        ) : props.editorMode ? (
          <div className="mt-10 flex aspect-[16/9] items-center justify-center bg-slate-100 text-sm text-slate-500">
            Add a venue image in section content
          </div>
        ) : null}
      </SiteContainer>,
    );
  }

  if (layout === "overlay") {
    return sectionShell(
      props,
      <SiteContainer>
        <div
          className="relative overflow-hidden shadow-sm"
          style={{ borderRadius: siteImageStyles(content).borderRadius }}
        >
          {imageUrl ? (
            <SiteImage src={imageUrl} display={content} className="aspect-[21/9]" />
          ) : (
            <div
              className="aspect-[21/9] w-full"
              style={{ backgroundColor: "var(--site-accent)" }}
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/30 to-transparent" />
          <div
            className={cn(
              "absolute inset-x-0 bottom-0 p-6 text-white md:p-10",
              textAlignClass(content, "left"),
            )}
          >
            <h2
              className="text-2xl font-semibold md:text-3xl"
              style={{ fontFamily: "var(--site-heading-font)" }}
            >
              {title}
            </h2>
            {address ? <p className="mt-2 text-lg text-white/90">{address}</p> : null}
            {description ? (
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/80">
                {description}
              </p>
            ) : null}
          </div>
        </div>
      </SiteContainer>,
    );
  }

  if (layout === "minimal") {
    return sectionShell(
      props,
      <SiteContainer>
        <div className="mx-auto max-w-2xl">{details}</div>
      </SiteContainer>,
      { background: "bg-slate-50/80" },
    );
  }

  return sectionShell(
    props,
    <SiteContainer>
      <div className="grid gap-8 md:grid-cols-2 md:items-center">
        {details}
        {imageUrl ? (
          <SiteImage src={imageUrl} display={content} className="aspect-video shadow-sm" />
        ) : props.editorMode ? (
          <div className="flex aspect-video items-center justify-center bg-slate-100 text-sm text-slate-500">
            Optional venue image
          </div>
        ) : null}
      </div>
    </SiteContainer>,
  );
}

export function GallerySection(props: SectionRenderProps) {
  const title = String(props.content.title ?? "Gallery");
  const sectionContent = props.content as Record<string, unknown>;
  const images = (props.content.images as GalleryImageItem[]) ?? [];
  if (images.length === 0 && !props.editorMode) return null;

  return sectionShell(
    props,
    <SiteContainer>
      <SiteHeading className={textAlignClass(props.content, "left")}>{title}</SiteHeading>
      <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {(images.length ? images : props.editorMode ? [{ id: "p", url: "", caption: "Add gallery images" }] : []).map(
          (img) => {
            const display = resolveImageDisplay(sectionContent, img);
            return (
            <li
              key={img.id}
              className="bg-white shadow-sm"
              style={{ borderRadius: "var(--site-radius)" }}
            >
              {img.url ? (
                <SiteImage src={img.url} alt={img.caption} display={display} className="aspect-[4/3]" />
              ) : (
                <div className="flex aspect-[4/3] items-center justify-center bg-slate-100 text-sm opacity-50">
                  {img.caption}
                </div>
              )}
            </li>
            );
          },
        )}
      </ul>
    </SiteContainer>,
    { background: "bg-slate-50/80" },
  );
}

export function RegistrationCtaSection(props: SectionRenderProps & { data: EventSiteRenderData }) {
  const { data, content, globalStyles } = props;
  if (!data.ctaVisible || !data.ctaHref) return null;
  const title = String(content.title ?? `Join us at ${data.eventName}`);
  const subtitle = String(content.subtitle ?? "");
  const background = getSectionBackgroundValue(content);
  const bg = resolveSectionBackground(content, undefined);
  const style: CSSProperties = { backgroundColor: "var(--site-accent)", ...bg.style };
  // Theme/custom/image are colourful by default and need light text; white/muted are
  // already light backgrounds, so keep the normal dark heading/body colours there.
  const useLightText = background !== "white" && background !== "muted";

  return sectionShell(
    props,
    <div
      className={cn("px-6 py-16 md:px-10", textAlignClass(content, "center"), useLightText && "text-white")}
      style={style}
    >
      <SiteContainer>
        <SiteHeading className={useLightText ? "!text-white" : undefined}>{title}</SiteHeading>
        {subtitle ? (
          <p className={cn("mx-auto mt-3 max-w-xl", useLightText ? "text-white/85" : "opacity-70")}>
            {subtitle}
          </p>
        ) : null}
        <div className={cn("mt-8 flex", alignJustifyClass(content, "center"))}>
          <SiteButton
            label={data.ctaLabel}
            href={data.ctaHref}
            accent={data.config.theme.accentColor}
            style="solid"
            radius={globalStyles.borderRadius}
            inverted={useLightText}
          />
        </div>
      </SiteContainer>
    </div>,
  );
}

export function ContactSection(props: SectionRenderProps & { data: EventSiteRenderData }) {
  const { content, data } = props;
  const title = String(content.title ?? "Contact");
  const email = String(content.email ?? "");
  const phone = String(content.phone ?? "");
  if (!email && !phone && !props.editorMode) return null;

  return sectionShell(
    props,
    <SiteContainer>
      <div className={textAlignClass(content, "left")}>
        <SiteHeading>{title}</SiteHeading>
        <div className="mt-6 space-y-2 text-sm">
          {content.showOrgName !== false ? (
            <p className="font-medium text-[var(--site-primary)]">{data.orgName}</p>
          ) : null}
          {email ? (
            <p>
              <a href={`mailto:${email}`} className="underline underline-offset-2">
                {email}
              </a>
            </p>
          ) : null}
          {phone ? <p>{phone}</p> : null}
        </div>
      </div>
    </SiteContainer>,
  );
}

export function FooterSection(props: SectionRenderProps & { data: EventSiteRenderData }) {
  const { content, data } = props;
  const copyright =
    String(content.copyright ?? "") ||
    `© ${new Date().getFullYear()} ${data.orgName}. All rights reserved.`;

  return (
    <footer
      className="border-t border-slate-200 bg-[var(--site-primary)] px-6 py-10 text-white/80 md:px-10"
      id={props.sectionId}
    >
      <SiteContainer className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          {content.showOrgName !== false ? (
            <p className="font-semibold text-white">{data.eventName}</p>
          ) : null}
          <p className="mt-1 text-sm">{copyright}</p>
        </div>
        {data.ctaVisible && data.ctaHref ? (
          <Link
            href={data.ctaHref}
            className="text-sm font-semibold text-white hover:underline"
          >
            {data.ctaLabel}
          </Link>
        ) : null}
      </SiteContainer>
    </footer>
  );
}

export function StatisticsSection(props: SectionRenderProps) {
  const title = String(props.content.title ?? "By the numbers");
  const items = (props.content.items as { value: string; label: string }[]) ?? [];

  return sectionShell(
    props,
    <SiteContainer>
      <SiteHeading className={textAlignClass(props.content, "center")}>{title}</SiteHeading>
      <ul className="mt-10 grid gap-6 sm:grid-cols-3">
        {items.map((item, i) => (
          <li key={i} className="text-center">
            <p
              className="text-4xl font-bold text-[var(--site-accent)] md:text-5xl"
              style={{ fontFamily: "var(--site-heading-font)" }}
            >
              {item.value}
            </p>
            <p className="mt-2 text-sm font-medium uppercase tracking-wide opacity-70">
              {item.label}
            </p>
          </li>
        ))}
      </ul>
    </SiteContainer>,
    { background: "bg-slate-50/80" },
  );
}

export function TestimonialsSection(props: SectionRenderProps) {
  const title = String(props.content.title ?? "What attendees say");
  const items = (props.content.items as { quote: string; author: string; role: string }[]) ?? [];
  if (items.length === 0 && !props.editorMode) return null;

  return sectionShell(
    props,
    <SiteContainer>
      <SiteHeading className={textAlignClass(props.content, "left")}>{title}</SiteHeading>
      <ul className="mt-8 grid gap-6 md:grid-cols-2">
        {items.map((item, i) => (
          <li
            key={i}
            className="bg-white p-6 shadow-sm"
            style={{ borderRadius: "var(--site-radius)" }}
          >
            <p className="text-lg leading-relaxed">&ldquo;{item.quote}&rdquo;</p>
            <p className="mt-4 text-sm font-semibold text-[var(--site-primary)]">
              {item.author}
            </p>
            {item.role ? <p className="text-sm opacity-60">{item.role}</p> : null}
          </li>
        ))}
      </ul>
    </SiteContainer>,
  );
}

export function FaqSection(props: SectionRenderProps) {
  const title = String(props.content.title ?? "FAQ");
  const items = (props.content.items as { question: string; answer: string }[]) ?? [];
  if (items.length === 0 && !props.editorMode) return null;

  return sectionShell(
    props,
    <SiteContainer>
      <SiteHeading className={textAlignClass(props.content, "left")}>{title}</SiteHeading>
      <dl className="mt-8 space-y-4">
        {items.map((item, i) => (
          <div
            key={i}
            className="bg-white p-5 shadow-sm"
            style={{ borderRadius: "var(--site-radius)" }}
          >
            <dt className="font-semibold text-[var(--site-primary)]">{item.question}</dt>
            <dd className="mt-2 text-sm leading-relaxed">{item.answer}</dd>
          </div>
        ))}
      </dl>
    </SiteContainer>,
    { background: "bg-slate-50/80" },
  );
}

export function renderSiteSection(
  props: SectionRenderProps & {
    data: EventSiteRenderData;
    sectionType: EventSiteSectionType;
  },
) {
  switch (props.sectionType) {
    case "header":
      return <HeaderSection {...props} />;
    case "hero":
      return <HeroSection {...props} />;
    case "about":
      return <AboutSection {...props} />;
    case "event-details":
      return <EventDetailsSection {...props} />;
    case "speakers":
      return <SpeakersSection {...props} />;
    case "agenda":
      return <AgendaSection {...props} />;
    case "sponsors":
      return <SponsorsSection {...props} />;
    case "venue":
      return <VenueSection {...props} />;
    case "gallery":
      return <GallerySection {...props} />;
    case "content":
      return <ContentSection {...props} />;
    case "registration-cta":
      return <RegistrationCtaSection {...props} />;
    case "contact":
      return <ContactSection {...props} />;
    case "footer":
      return <FooterSection {...props} />;
    case "statistics":
      return <StatisticsSection {...props} />;
    case "testimonials":
      return <TestimonialsSection {...props} />;
    case "faq":
      return <FaqSection {...props} />;
    default:
      return null;
  }
}
