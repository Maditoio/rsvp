"use client";

import {
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import type { BadgePrintPayload } from "@/modules/badges/print-payload";
import {
  snapElementPose,
  type BadgeElementId,
  type SnapGuideState,
} from "@/modules/badges/layout";
import { categoryAccentStyle } from "@/modules/badges/category-accent";
import {
  badgeBackgroundStyle,
  gradientTextStyle,
  solidTextStyle,
} from "@/modules/badges/colors";
import { BADGE_FONT_CSS } from "@/modules/badges/fonts";
import {
  badgeEventLogoStyle,
  badgeQrStyle,
  badgeSponsorLogoStyle,
} from "@/modules/badges/sizing";
import { cn } from "@/lib/utils";

function PoseShell({
  id,
  layout,
  editable,
  selected,
  onSelect,
  onMove,
  onSnapGuides,
  className,
  style,
  children,
}: {
  id: BadgeElementId;
  layout: BadgePrintPayload["config"]["layout"];
  editable?: boolean;
  selected?: boolean;
  onSelect?: (id: BadgeElementId | null) => void;
  onMove?: (id: BadgeElementId, x: number, y: number) => void;
  onSnapGuides?: (guides: SnapGuideState | null) => void;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}) {
  const pose = layout[id];

  function handlePointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    if (!editable || !onMove) return;
    e.preventDefault();
    e.stopPropagation();
    onSelect?.(id);

    const shell = e.currentTarget;
    const parent = shell.offsetParent as HTMLElement | null;
    if (!parent) return;

    const parentRect = parent.getBoundingClientRect();
    const shellRect = shell.getBoundingClientRect();
    const widthPct = (shellRect.width / parentRect.width) * 100;
    const heightPct = (shellRect.height / parentRect.height) * 100;
    const startX = e.clientX;
    const startY = e.clientY;
    const originX = pose.x;
    const originY = pose.y;

    shell.setPointerCapture(e.pointerId);

    function onMovePointer(ev: PointerEvent) {
      const dxPct = ((ev.clientX - startX) / parentRect.width) * 100;
      const dyPct = ((ev.clientY - startY) / parentRect.height) * 100;
      const snapped = snapElementPose(
        originX + dxPct,
        originY + dyPct,
        widthPct,
        heightPct,
      );
      onSnapGuides?.(snapped.guides);
      onMove?.(id, snapped.x, snapped.y);
    }

    function onUp(ev: PointerEvent) {
      shell.releasePointerCapture(ev.pointerId);
      onSnapGuides?.(null);
      window.removeEventListener("pointermove", onMovePointer);
      window.removeEventListener("pointerup", onUp);
    }

    window.addEventListener("pointermove", onMovePointer);
    window.addEventListener("pointerup", onUp);
  }

  return (
    <div
      data-badge-el={id}
      className={cn(
        "absolute w-fit max-w-none",
        editable && "cursor-grab touch-none active:cursor-grabbing",
        editable &&
          selected &&
          "rounded-md ring-2 ring-indigo-600 ring-offset-1",
        className,
      )}
      style={{
        left: `${pose.x}%`,
        top: `${pose.y}%`,
        zIndex: pose.zIndex,
        ...style,
      }}
      onPointerDown={handlePointerDown}
      onClick={(e) => {
        if (!editable) return;
        e.stopPropagation();
        onSelect?.(id);
      }}
    >
      {children}
    </div>
  );
}

function SnapGuides({ guides }: { guides: SnapGuideState }) {
  return (
    <>
      {guides.vertical ? (
        <div
          className="pointer-events-none absolute inset-y-0 left-1/2 z-[60] w-px -translate-x-1/2 bg-indigo-600"
          aria-hidden
        />
      ) : null}
      {guides.horizontal ? (
        <div
          className="pointer-events-none absolute inset-x-0 top-1/2 z-[60] h-px -translate-y-1/2 bg-indigo-600"
          aria-hidden
        />
      ) : null}
    </>
  );
}

function nameClampClass(maxLines: number): string {
  if (maxLines <= 1) return "line-clamp-1";
  if (maxLines >= 3) return "line-clamp-3";
  return "line-clamp-2";
}

function AttendeeName({
  badge,
  textAlign,
  nameStyle,
}: {
  badge: BadgePrintPayload;
  textAlign: string;
  nameStyle: CSSProperties;
}) {
  const { config } = badge;
  return (
    <p
      className={cn(
        "max-w-[85mm] leading-tight",
        nameClampClass(config.nameMaxLines),
        textAlign,
      )}
      style={{
        fontSize: config.nameSize,
        fontWeight: config.nameWeight,
        fontFamily: BADGE_FONT_CSS[config.nameFont ?? "inter"],
        letterSpacing: config.letterSpacing,
        ...nameStyle,
      }}
    >
      {badge.firstName} {badge.lastName}
    </p>
  );
}

function CategoryBadge({
  badge,
  textAlign,
  editable,
}: {
  badge: BadgePrintPayload;
  textAlign: string;
  editable?: boolean;
}) {
  const { config } = badge;
  const label = badge.categoryName?.trim() || "Category";
  const isPlaceholder = !badge.categoryName?.trim();

  if (config.categoryStyle === "pill") {
    return (
      <span
        className={cn(
          "inline-block max-w-[85mm] rounded-full px-2.5 py-0.5 font-semibold shadow-sm ring-1 ring-white/70",
          isPlaceholder && editable && "opacity-80",
        )}
        style={{
          ...categoryAccentStyle(label),
          fontSize: Math.max(config.categorySize, editable ? 12 : 0),
          fontFamily: BADGE_FONT_CSS[config.categoryFont ?? "inter"],
        }}
      >
        {label}
      </span>
    );
  }

  return (
    <p
      className={cn(
        "max-w-[85mm] font-semibold drop-shadow-sm",
        textAlign,
        isPlaceholder && editable && "opacity-80",
      )}
      style={{
        fontSize: Math.max(config.categorySize, editable ? 12 : 0),
        fontFamily: BADGE_FONT_CSS[config.categoryFont ?? "inter"],
        color: config.categoryColor,
      }}
    >
      {label}
    </p>
  );
}

export function BadgeCard({
  badge,
  editable,
  selectedElement,
  onSelectElement,
  onMoveElement,
}: {
  badge: BadgePrintPayload;
  editable?: boolean;
  selectedElement?: BadgeElementId | null;
  onSelectElement?: (id: BadgeElementId | null) => void;
  onMoveElement?: (id: BadgeElementId, x: number, y: number) => void;
}) {
  const { config, logoUrl, sponsorLogos } = badge;
  const layout = config.layout;
  const [snapGuides, setSnapGuides] = useState<SnapGuideState | null>(null);

  const nameStyle =
    config.nameFill === "gradient"
      ? gradientTextStyle(
          config.nameGradientFrom,
          config.nameGradientTo,
          config.nameGradientAngle,
        )
      : solidTextStyle(config.nameColor);
  const eventNameStyle =
    config.eventNameFill === "gradient"
      ? gradientTextStyle(
          config.eventNameGradientFrom,
          config.eventNameGradientTo,
          config.eventNameGradientAngle,
        )
      : solidTextStyle(config.eventNameColor);

  const textAlign =
    config.textAlign === "left"
      ? "text-left"
      : config.textAlign === "right"
        ? "text-right"
        : "text-center";

  const shell = {
    layout,
    editable,
    onSelect: onSelectElement,
    onMove: onMoveElement,
    onSnapGuides: setSnapGuides,
  };

  const showCategory = config.showCategory;
  const stack = config.stackAttendeeFields;
  const stackGap = Math.min(Math.max(config.contentGap, 2), 24);

  return (
    <article
      className="badge-card relative h-full w-full overflow-hidden shadow-sm"
      style={{
        borderRadius: config.borderRadius,
        padding: 0,
        ...badgeBackgroundStyle({
          fill: config.badgeBgFill,
          color: config.badgeBgColor,
          from: config.badgeBgGradientFrom,
          to: config.badgeBgGradientTo,
          angle: config.badgeBgGradientAngle,
        }),
      }}
      onClick={() => onSelectElement?.(null)}
    >
      {snapGuides ? <SnapGuides guides={snapGuides} /> : null}

      {config.showEventLogo && logoUrl ? (
        <PoseShell
          id="eventLogo"
          {...shell}
          selected={selectedElement === "eventLogo"}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={logoUrl}
            alt=""
            className="block object-contain"
            style={badgeEventLogoStyle("top", config.eventLogoSize)}
            draggable={false}
          />
        </PoseShell>
      ) : null}

      {config.showEventName ? (
        <PoseShell
          id="eventName"
          {...shell}
          selected={selectedElement === "eventName"}
        >
          <p
            className={cn(
              "line-clamp-2 max-w-[80mm] font-semibold uppercase tracking-wide",
              textAlign,
            )}
            style={{
              fontSize: config.eventNameSize,
              fontFamily: BADGE_FONT_CSS[config.eventNameFont ?? "inter"],
              ...eventNameStyle,
            }}
          >
            {badge.eventName}
          </p>
        </PoseShell>
      ) : null}

      {stack ? (
        <PoseShell
          id="name"
          {...shell}
          selected={
            selectedElement === "name" ||
            selectedElement === "company" ||
            selectedElement === "jobTitle" ||
            selectedElement === "country"
          }
        >
          <div
            className={cn("flex max-w-[85mm] flex-col", textAlign)}
            style={{ gap: stackGap }}
          >
            <AttendeeName
              badge={badge}
              textAlign={textAlign}
              nameStyle={nameStyle}
            />
            {config.showCompany && badge.company ? (
              <p
                className={cn("line-clamp-2 font-medium", textAlign)}
                style={{
                  fontSize: config.companySize,
                  fontFamily: BADGE_FONT_CSS[config.companyFont ?? "inter"],
                  color: config.companyColor,
                }}
              >
                {badge.company}
              </p>
            ) : null}
            {config.showJobTitle && badge.jobTitle ? (
              <p
                className={cn("line-clamp-2", textAlign)}
                style={{
                  fontSize: config.jobTitleSize,
                  fontFamily: BADGE_FONT_CSS[config.jobTitleFont ?? "inter"],
                  color: config.jobTitleColor,
                }}
              >
                {badge.jobTitle}
              </p>
            ) : null}
            {config.showCountry && badge.country ? (
              <p
                className={cn("line-clamp-1", textAlign)}
                style={{
                  fontSize: config.countrySize,
                  fontFamily: BADGE_FONT_CSS[config.countryFont ?? "inter"],
                  color: config.countryColor,
                }}
              >
                {badge.country}
              </p>
            ) : null}
          </div>
        </PoseShell>
      ) : (
        <>
          <PoseShell id="name" {...shell} selected={selectedElement === "name"}>
            <AttendeeName
              badge={badge}
              textAlign={textAlign}
              nameStyle={nameStyle}
            />
          </PoseShell>
          {config.showCompany && badge.company ? (
            <PoseShell
              id="company"
              {...shell}
              selected={selectedElement === "company"}
            >
              <p
                className={cn("line-clamp-2 max-w-[85mm] font-medium", textAlign)}
                style={{
                  fontSize: config.companySize,
                  fontFamily: BADGE_FONT_CSS[config.companyFont ?? "inter"],
                  color: config.companyColor,
                }}
              >
                {badge.company}
              </p>
            </PoseShell>
          ) : null}
          {config.showJobTitle && badge.jobTitle ? (
            <PoseShell
              id="jobTitle"
              {...shell}
              selected={selectedElement === "jobTitle"}
            >
              <p
                className={cn("line-clamp-2 max-w-[85mm]", textAlign)}
                style={{
                  fontSize: config.jobTitleSize,
                  fontFamily: BADGE_FONT_CSS[config.jobTitleFont ?? "inter"],
                  color: config.jobTitleColor,
                }}
              >
                {badge.jobTitle}
              </p>
            </PoseShell>
          ) : null}
          {config.showCountry && badge.country ? (
            <PoseShell
              id="country"
              {...shell}
              selected={selectedElement === "country"}
            >
              <p
                className={cn("line-clamp-1 max-w-[85mm]", textAlign)}
                style={{
                  fontSize: config.countrySize,
                  fontFamily: BADGE_FONT_CSS[config.countryFont ?? "inter"],
                  color: config.countryColor,
                }}
              >
                {badge.country}
              </p>
            </PoseShell>
          ) : null}
        </>
      )}

      {showCategory ? (
        <PoseShell
          id="category"
          {...shell}
          selected={selectedElement === "category"}
          className={editable ? "drop-shadow-md" : undefined}
        >
          <CategoryBadge
            badge={badge}
            textAlign={textAlign}
            editable={editable}
          />
        </PoseShell>
      ) : null}

      {config.showSponsors && sponsorLogos.length > 0 ? (
        <PoseShell
          id="sponsors"
          {...shell}
          selected={selectedElement === "sponsors"}
        >
          <div className="flex max-w-[90mm] flex-wrap items-center gap-2">
            {sponsorLogos.map((s) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={s.id}
                src={s.url}
                alt={s.name}
                title={s.name}
                className="block object-contain"
                style={badgeSponsorLogoStyle(config.sponsorLogoSize)}
                draggable={false}
              />
            ))}
          </div>
        </PoseShell>
      ) : null}

      {config.showQr ? (
        <PoseShell id="qr" {...shell} selected={selectedElement === "qr"}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={badge.qrDataUrl}
            alt="Check-in QR"
            className="block"
            style={badgeQrStyle(config.qrPx)}
            draggable={false}
          />
        </PoseShell>
      ) : null}
    </article>
  );
}
