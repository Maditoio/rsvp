import Link from "next/link";
import { cn, formatEventWindow } from "@/lib/utils";
import { SiteMobileNav } from "./site-mobile-nav";
import {
  speakerDisplayName,
  type EventSiteSpeaker,
} from "@/modules/event-sites/config";
import { parseSponsorSectionTiers, sponsorAltText } from "@/modules/sponsors/config";
import {
  SiteButton,
  SiteContainer,
  SiteHeading,
  SiteSection,
} from "./site-primitives";
import type { EventSiteSectionType } from "@/modules/event-sites/sections";
import type { EventSiteRenderData, SectionRenderProps } from "./types";

function eventDates(data: EventSiteRenderData): string | null {
  if (!data.startsAt) return null;
  return formatEventWindow(
    data.startsAt instanceof Date ? data.startsAt : new Date(data.startsAt),
    data.endsAt
      ? data.endsAt instanceof Date
        ? data.endsAt
        : new Date(data.endsAt)
      : null,
    data.timezone,
  );
}

function sectionShell(
  props: SectionRenderProps,
  children: React.ReactNode,
  className?: string,
) {
  if (!props.content && props.sectionId) return null;
  return (
    <SiteSection
      id={props.sectionId}
      selected={props.selected}
      onSelect={props.onSelect}
      editorMode={props.editorMode}
      className={className}
    >
      {children}
    </SiteSection>
  );
}

export function HeaderSection(props: SectionRenderProps & { data: EventSiteRenderData }) {
  const { data, content, globalStyles } = props;
  const showLogo = content.showLogo !== false;
  const sticky = content.sticky !== false;
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
          {showLogo && data.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={data.logoUrl}
              alt=""
              className="h-9 w-auto max-w-[140px] object-contain"
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
  const imageUrl = (content.imageUrl as string | null) ?? data.logoUrl;
  const showDates = content.showDates !== false;
  const showVenue = content.showVenue !== false;
  const dates = showDates ? eventDates(data) : null;
  const overlay = String(content.overlay ?? "gradient");
  const primaryLabel = String(content.primaryCtaLabel ?? data.ctaLabel);
  const secondaryLabel = String(content.secondaryCtaLabel ?? "");
  const secondaryUrl = content.secondaryCtaUrl as string | null;

  if (variant === "split") {
    return sectionShell(
      props,
      <SiteContainer>
        <div className="grid items-center gap-10 md:grid-cols-2 md:gap-12">
          <div>
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
            <div className="mt-8 flex flex-wrap gap-3">
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
            className="overflow-hidden shadow-lg"
            style={{ borderRadius: "var(--site-radius)" }}
          >
            {imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={imageUrl}
                alt=""
                className="aspect-[4/3] w-full object-cover"
              />
            ) : (
              <div
                className="flex aspect-[4/3] items-center justify-center text-white/70"
                style={{ backgroundColor: "var(--site-primary)" }}
              >
                {props.editorMode ? "Add hero image" : null}
              </div>
            )}
          </div>
        </div>
      </SiteContainer>,
    );
  }

  if (variant === "compact") {
    return sectionShell(
      props,
      <SiteContainer className="text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] opacity-60">
          {eyebrow}
        </p>
        <SiteHeading as="h1" className="mt-3">
          {headline}
        </SiteHeading>
        {dates ? <p className="mt-3 text-sm opacity-70">{dates}</p> : null}
        {subheadline ? <p className="mx-auto mt-4 max-w-xl">{subheadline}</p> : null}
        {data.ctaVisible && data.ctaHref ? (
          <div className="mt-8 flex justify-center">
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
      "border-b border-slate-100",
    );
  }

  if (variant === "editorial") {
    return sectionShell(
      props,
      <SiteContainer>
        <div className="mx-auto max-w-3xl text-center">
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
      "border-b border-amber-100/60 bg-gradient-to-b from-amber-50/50 to-transparent",
    );
  }

  return sectionShell(
    props,
    <>
      <div
        className="relative overflow-hidden px-6 py-20 text-white md:px-10 md:py-28"
        style={{ backgroundColor: "var(--site-primary)" }}
      >
        {imageUrl ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageUrl}
              alt=""
              className="absolute inset-0 size-full object-cover"
            />
            <div
              className={cn(
                "absolute inset-0",
                overlay === "dark" && "bg-black/60",
                overlay === "gradient" &&
                  "bg-gradient-to-r from-[var(--site-primary)]/95 via-[var(--site-primary)]/80 to-[var(--site-primary)]/40",
                overlay === "none" && "bg-black/20",
              )}
              aria-hidden
            />
          </>
        ) : null}
        <SiteContainer className="relative">
          {content.showLogo !== false && data.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={data.logoUrl}
              alt=""
              className="mb-6 h-12 w-auto object-contain"
            />
          ) : null}
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/70">
            {eyebrow}
          </p>
          <h1
            className="mt-3 max-w-4xl text-4xl font-semibold tracking-tight text-white md:text-5xl lg:text-6xl"
            style={{ fontFamily: "var(--site-heading-font)" }}
          >
            {headline}
          </h1>
          {subheadline ? (
            <p className="mt-4 max-w-2xl text-lg text-white/85">{subheadline}</p>
          ) : null}
          <div className="mt-6 flex flex-wrap items-center gap-4 text-sm text-white/80">
            {dates ? <span>{dates}</span> : null}
            {showVenue && data.venue ? (
              <span>{dates ? "· " : ""}{data.venue}</span>
            ) : null}
          </div>
          <div className="mt-8 flex flex-wrap gap-3">
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
      </div>
    </>,
  );
}

export function AboutSection(props: SectionRenderProps & { data: EventSiteRenderData }) {
  const { content, variant } = props;
  const title = String(content.title ?? "About the event");
  const body = String(content.body ?? "");
  if (!body.trim()) return props.editorMode ? sectionShell(props, <SiteContainer><SiteHeading>{title}</SiteHeading><p className="mt-4 opacity-50">Add about content in the editor.</p></SiteContainer>) : null;

  if (variant === "split" && content.imageUrl) {
    return sectionShell(
      props,
      <SiteContainer id="about">
        <div className="grid items-center gap-10 md:grid-cols-2">
          <div>
            <SiteHeading>{title}</SiteHeading>
            <p className="mt-4 whitespace-pre-wrap leading-relaxed">{body}</p>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={String(content.imageUrl)}
            alt=""
            className="aspect-[4/3] w-full object-cover shadow-sm"
            style={{ borderRadius: "var(--site-radius)" }}
          />
        </div>
      </SiteContainer>,
    );
  }

  return sectionShell(
    props,
    <SiteContainer id="about">
      <SiteHeading>{title}</SiteHeading>
      <p className="mt-4 max-w-3xl whitespace-pre-wrap leading-relaxed">{body}</p>
    </SiteContainer>,
  );
}

export function EventDetailsSection(props: SectionRenderProps & { data: EventSiteRenderData }) {
  const { data, content } = props;
  const title = String(content.title ?? "Event details");
  const dates = content.showDates !== false ? eventDates(data) : null;

  return sectionShell(
    props,
    <SiteContainer>
      <SiteHeading>{title}</SiteHeading>
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
        {content.showVenue !== false && data.venue ? (
          <div
            className="rounded-xl bg-white p-5 shadow-sm"
            style={{ borderRadius: "var(--site-radius)" }}
          >
            <dt className="text-xs font-semibold uppercase tracking-wide opacity-60">Venue</dt>
            <dd className="mt-1 font-medium text-[var(--site-primary)]">{data.venue}</dd>
          </div>
        ) : null}
        {content.showTimezone !== false && data.timezone ? (
          <div
            className="rounded-xl bg-white p-5 shadow-sm"
            style={{ borderRadius: "var(--site-radius)" }}
          >
            <dt className="text-xs font-semibold uppercase tracking-wide opacity-60">Timezone</dt>
            <dd className="mt-1 font-medium text-[var(--site-primary)]">{data.timezone}</dd>
          </div>
        ) : null}
      </dl>
    </SiteContainer>,
    "bg-slate-50/80",
  );
}

export function SpeakersSection(props: SectionRenderProps & { data: EventSiteRenderData }) {
  const { content, editorMode } = props;
  const title = String(content.title ?? "Speakers");
  const items = ((content.items as EventSiteSpeaker[]) ?? []).filter(
    (s) => !s.hidden,
  );
  if (items.length === 0 && !editorMode) return null;

  return sectionShell(
    props,
    <SiteContainer id="speakers">
      <SiteHeading>{title}</SiteHeading>
      <ul className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {(items.length ? items : editorMode ? [{ id: "placeholder", firstName: "Add", lastName: "speaker", order: 0, featured: false, hidden: false }] : []).map(
          (speaker) => (
            <li
              key={speaker.id}
              className="overflow-hidden bg-white shadow-sm"
              style={{ borderRadius: "var(--site-radius)" }}
            >
              {speaker.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={speaker.photoUrl}
                  alt=""
                  className="aspect-[4/5] w-full object-cover"
                />
              ) : (
                <div
                  className="flex aspect-[4/5] items-center justify-center text-sm font-medium text-white"
                  style={{ backgroundColor: "var(--site-accent)" }}
                >
                  {editorMode
                    ? "Add speaker photo"
                    : speakerDisplayName(speaker).slice(0, 1).toUpperCase()}
                </div>
              )}
              <div className="p-4">
                <p
                  className="font-semibold text-[var(--site-primary)]"
                  style={{ fontFamily: "var(--site-heading-font)" }}
                >
                  {speakerDisplayName(speaker)}
                </p>
                {speaker.jobTitle || speaker.organization ? (
                  <p className="mt-1 text-sm opacity-70">
                    {[speaker.jobTitle, speaker.organization]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                ) : null}
                {speaker.bio ? (
                  <p className="mt-2 line-clamp-3 text-sm">{speaker.bio}</p>
                ) : null}
              </div>
            </li>
          ),
        )}
      </ul>
    </SiteContainer>,
  );
}

export function AgendaSection(props: SectionRenderProps & { data: EventSiteRenderData }) {
  const { data, content } = props;
  const title = String(content.title ?? "Agenda");
  if (data.sessions.length === 0 && !props.editorMode) return null;

  return sectionShell(
    props,
    <SiteContainer id="agenda">
      <SiteHeading>{title}</SiteHeading>
      <ul className="mt-8 space-y-3">
        {(data.sessions.length ? data.sessions : props.editorMode ? [{ id: "p", title: "Sessions appear from your event agenda", dateLabel: "", timeLabel: null, description: null, location: null }] : []).map(
          (session) => (
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
          ),
        )}
      </ul>
    </SiteContainer>,
    "bg-slate-50/80",
  );
}

export function SponsorsSection(props: SectionRenderProps) {
  const title = String(props.content.title ?? "Our sponsors");
  const showTiers = parseSponsorSectionTiers(props.content.showTiers);
  const tiers = props.data.sponsorGroups.filter((group) =>
    showTiers.includes(group.tier),
  );
  const hasSponsors = tiers.some((t) => t.sponsors.length > 0);
  if (!hasSponsors && !props.editorMode) return null;

  return sectionShell(
    props,
    <SiteContainer>
      <SiteHeading>{title}</SiteHeading>
      <div className="mt-10 space-y-10">
        {tiers.map((tier) =>
          tier.sponsors.length > 0 || props.editorMode ? (
            <div key={tier.tier}>
              <p className="text-center text-xs font-semibold uppercase tracking-[0.15em] opacity-50">
                {tier.label}
              </p>
              <ul className="mt-4 flex flex-wrap items-center justify-center gap-8">
                {(tier.sponsors.length
                  ? tier.sponsors
                  : props.editorMode
                    ? [
                        {
                          id: `placeholder-${tier.tier}`,
                          name: "Sponsor logo",
                          logoUrl: null,
                          websiteUrl: null,
                          sortOrder: 0,
                          tier: tier.tier,
                        },
                      ]
                    : []
                ).map((s) => {
                  const alt = sponsorAltText(s);
                  return (
                  <li key={s.id}>
                    {s.logoUrl ? (
                      s.websiteUrl ? (
                        <a
                          href={s.websiteUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block"
                          title={alt}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={s.logoUrl}
                            alt={alt}
                            className="h-12 max-w-[160px] object-contain opacity-80 grayscale transition hover:opacity-100 hover:grayscale-0"
                          />
                        </a>
                      ) : (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={s.logoUrl}
                          alt={alt}
                          className="h-12 max-w-[160px] object-contain opacity-80 grayscale transition hover:opacity-100 hover:grayscale-0"
                        />
                      )
                    ) : (
                      <span className="text-sm opacity-40">{alt}</span>
                    )}
                  </li>
                  );
                })}
              </ul>
            </div>
          ) : null,
        )}
      </div>
    </SiteContainer>,
  );
}

export function VenueSection(props: SectionRenderProps & { data: EventSiteRenderData }) {
  const { content, data } = props;
  const title = String(content.title ?? "Venue");
  const address = String(content.address || data.venue || "");
  if (!address && !props.editorMode) return null;

  return sectionShell(
    props,
    <SiteContainer>
      <div className="grid gap-8 md:grid-cols-2 md:items-center">
        <div>
          <SiteHeading>{title}</SiteHeading>
          {address ? <p className="mt-4 text-lg">{address}</p> : null}
          {content.description ? (
            <p className="mt-3 text-sm leading-relaxed">{String(content.description)}</p>
          ) : null}
        </div>
        {content.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={String(content.imageUrl)}
            alt=""
            className="aspect-video w-full object-cover shadow-sm"
            style={{ borderRadius: "var(--site-radius)" }}
          />
        ) : null}
      </div>
    </SiteContainer>,
  );
}

export function GallerySection(props: SectionRenderProps) {
  const title = String(props.content.title ?? "Gallery");
  const images = (props.content.images as { id: string; url: string; caption: string }[]) ?? [];
  if (images.length === 0 && !props.editorMode) return null;

  return sectionShell(
    props,
    <SiteContainer>
      <SiteHeading>{title}</SiteHeading>
      <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {(images.length ? images : props.editorMode ? [{ id: "p", url: "", caption: "Add gallery images" }] : []).map(
          (img) => (
            <li
              key={img.id}
              className="overflow-hidden bg-white shadow-sm"
              style={{ borderRadius: "var(--site-radius)" }}
            >
              {img.url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={img.url} alt={img.caption} className="aspect-[4/3] w-full object-cover" />
              ) : (
                <div className="flex aspect-[4/3] items-center justify-center bg-slate-100 text-sm opacity-50">
                  {img.caption}
                </div>
              )}
            </li>
          ),
        )}
      </ul>
    </SiteContainer>,
    "bg-slate-50/80",
  );
}

export function RegistrationCtaSection(props: SectionRenderProps & { data: EventSiteRenderData }) {
  const { data, content, globalStyles } = props;
  if (!data.ctaVisible || !data.ctaHref) return null;
  const title = String(content.title ?? `Join us at ${data.eventName}`);
  const subtitle = String(content.subtitle ?? "");

  return sectionShell(
    props,
    <div
      className="px-6 py-16 text-center text-white md:px-10"
      style={{ backgroundColor: "var(--site-accent)" }}
    >
      <SiteContainer>
        <SiteHeading className="!text-white">{title}</SiteHeading>
        {subtitle ? <p className="mx-auto mt-3 max-w-xl text-white/85">{subtitle}</p> : null}
        <div className="mt-8 flex justify-center">
          <SiteButton
            label={data.ctaLabel}
            href={data.ctaHref}
            accent={data.config.theme.accentColor}
            style="solid"
            radius={globalStyles.borderRadius}
            inverted
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
      <SiteHeading className="text-center">{title}</SiteHeading>
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
    "bg-slate-50/80",
  );
}

export function TestimonialsSection(props: SectionRenderProps) {
  const title = String(props.content.title ?? "What attendees say");
  const items = (props.content.items as { quote: string; author: string; role: string }[]) ?? [];
  if (items.length === 0 && !props.editorMode) return null;

  return sectionShell(
    props,
    <SiteContainer>
      <SiteHeading>{title}</SiteHeading>
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
      <SiteHeading>{title}</SiteHeading>
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
    "bg-slate-50/80",
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
