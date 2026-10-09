"use client";

import type { CSSProperties } from "react";
import {
  brandHeadingCssFamily,
  brandHeadingCssLineHeight,
  brandHeadingCssTextAlign,
  brandHeadingCssTracking,
  brandHeadingCssWeight,
  brandHeadingPreviewTitlePx,
  type BrandHeadingAlign,
  type BrandHeadingFont,
  type BrandHeadingLineHeight,
  type BrandHeadingSize,
  type BrandHeadingTracking,
  type BrandHeadingWeight,
} from "@/modules/branding/brand-heading-style";
import { parsePhotoZoom } from "@/modules/branding/cover-focal";
import { heroOverlayStops } from "@/modules/branding/heading-contrast";
import {
  type EmailHeroBackgroundMode,
  type EmailHeroGradientStyle,
  gradientPreset,
} from "@/modules/communications/invite-hero-background";
import { cn } from "@/lib/utils";

export function InviteHeroLivePreview({
  enabled,
  backgroundMode,
  gradientStyle,
  blur = 6,
  overlay = 55,
  focalX = 50,
  focalY = 50,
  zoom = 100,
  accentColor,
  photoUrl,
  photoPreviewUrl,
  logoUrl,
  eyebrow,
  title,
  eventName,
  detailLines,
  closing,
  savedHeroUrl,
  headingColor = "#FFFFFF",
  headingFont = "inter",
  headingSize = 54,
  headingWeight = "bold",
  headingTracking = "normal",
  headingAlign = "center",
  headingLineHeight = "normal",
  eyebrowUppercase = true,
}: {
  enabled: boolean;
  backgroundMode: EmailHeroBackgroundMode;
  gradientStyle: EmailHeroGradientStyle;
  /** Soft blur behind copy when mode is Photo (0–24). */
  blur?: number;
  /** Dark veil strength 0–100. */
  overlay?: number;
  focalX?: number;
  focalY?: number;
  /** Photo zoom percent 100–200. */
  zoom?: number;
  accentColor: string;
  /** Source photo for hero IMAGE mode (not the composed PNG). */
  photoUrl: string | null;
  /** Local object URL while a file is selected but not yet uploaded */
  photoPreviewUrl?: string | null;
  logoUrl: string | null;
  eyebrow: string;
  title: string;
  eventName: string;
  detailLines: string[];
  closing: string;
  savedHeroUrl: string | null;
  headingColor?: string;
  headingFont?: BrandHeadingFont;
  headingSize?: BrandHeadingSize;
  headingWeight?: BrandHeadingWeight;
  headingTracking?: BrandHeadingTracking;
  headingAlign?: BrandHeadingAlign;
  headingLineHeight?: BrandHeadingLineHeight;
  eyebrowUppercase?: boolean;
}) {
  if (!enabled) {
    return (
      <p className="rounded-xl bg-slate-50 px-4 py-8 text-center text-sm text-slate-600">
        Turn on the invitation hero to preview the composed graphic.
      </p>
    );
  }

  const displayTitle = title.trim() || eventName;
  const eyebrowRaw = eyebrow.trim() || "You are invited to";
  const displayEyebrow = eyebrowUppercase
    ? eyebrowRaw.toUpperCase()
    : eyebrowRaw;
  const displayClosing = closing.trim();
  const photoSrc = photoPreviewUrl || photoUrl;
  const gradient = gradientPreset(gradientStyle);
  const objectPosition = `${focalX}% ${focalY}%`;
  const zoomPct = parsePhotoZoom(zoom, 100);
  const photoScale = (zoomPct / 100) * (blur > 0 ? 1.08 : 1);
  const titlePx = brandHeadingPreviewTitlePx(headingSize);
  const veil = heroOverlayStops(overlay);
  const textAlign = brandHeadingCssTextAlign(headingAlign);
  const lineHeight = brandHeadingCssLineHeight(headingLineHeight);
  const centered = textAlign === "center";

  let backgroundStyle: CSSProperties = {
    backgroundColor: accentColor,
  };
  if (backgroundMode === "IMAGE" && photoSrc) {
    backgroundStyle = {
      backgroundColor: accentColor,
    };
  } else if (backgroundMode === "GRADIENT") {
    backgroundStyle = { background: gradient.css };
  } else {
    backgroundStyle = {
      background: `linear-gradient(180deg, ${accentColor} 0%, ${accentColor}dd 100%)`,
    };
  }

  return (
    <div className="space-y-2">
      <div
        className="relative aspect-[3/4] overflow-hidden shadow-sm"
        style={backgroundStyle}
      >
        {backgroundMode === "IMAGE" && photoSrc ? (
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `url(${photoSrc})`,
              backgroundSize: "cover",
              backgroundPosition: objectPosition,
              filter: `blur(${Math.max(0, blur)}px) brightness(0.75)`,
              transform: `scale(${photoScale})`,
              transformOrigin: objectPosition,
            }}
            aria-hidden
          />
        ) : null}
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(to bottom, rgba(0,0,0,${veil.top.toFixed(3)}) 0%, rgba(0,0,0,${veil.mid.toFixed(3)}) 40%, rgba(0,0,0,${veil.bottom.toFixed(3)}) 100%)`,
          }}
          aria-hidden
        />
        <div
          className={cn(
            "relative flex h-full min-w-0 flex-col overflow-hidden px-6 pb-10 pt-9",
            centered ? "items-center text-center" : "items-start text-left",
          )}
          style={{
            color: headingColor,
            fontFamily: brandHeadingCssFamily(headingFont),
          }}
        >
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoUrl}
              alt=""
              className="max-h-14 max-w-[200px] object-contain drop-shadow-md"
            />
          ) : (
            <div className="h-14" aria-hidden />
          )}
          <div
            className={cn(
              "flex min-h-0 w-full min-w-0 flex-1 flex-col justify-evenly py-4",
              centered ? "items-center text-center" : "items-start text-left",
            )}
          >
            <div className="w-full min-w-0 max-w-full">
              <p className="break-words text-sm font-medium opacity-90">
                {displayEyebrow}
              </p>
              <p
                className="mt-3 break-words"
                style={{
                  fontSize: titlePx,
                  fontWeight: brandHeadingCssWeight(headingWeight),
                  letterSpacing: brandHeadingCssTracking(headingTracking),
                  lineHeight,
                }}
              >
                {displayTitle}
              </p>
            </div>
            {detailLines.length > 0 ? (
              <div className="w-full min-w-0 max-w-full">
                <div
                  className={cn(
                    "mb-4 h-0.5 w-24 opacity-80",
                    centered && "mx-auto",
                  )}
                  style={{ backgroundColor: headingColor }}
                />
                <div className="space-y-1 break-words text-sm font-medium opacity-95">
                  {detailLines.map((line) => (
                    <p key={line}>{line}</p>
                  ))}
                </div>
              </div>
            ) : (
              <div aria-hidden />
            )}
            {displayClosing ? (
              <p className="w-full min-w-0 max-w-full break-words text-sm italic opacity-85">
                {displayClosing}
              </p>
            ) : (
              <div aria-hidden />
            )}
          </div>
        </div>
      </div>
      {savedHeroUrl ? (
        <p className="text-center text-xs text-slate-400">
          Saved email image is shown in invitations after you save.
        </p>
      ) : (
        <p className="text-center text-xs text-slate-400">
          Live preview — save to bake this into the invitation email.
        </p>
      )}
    </div>
  );
}
