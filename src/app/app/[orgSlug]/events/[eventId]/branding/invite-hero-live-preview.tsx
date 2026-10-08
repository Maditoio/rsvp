"use client";

import type { CSSProperties } from "react";
import {
  brandHeadingCssFamily,
  type BrandHeadingFont,
  type BrandHeadingSize,
} from "@/modules/branding/brand-heading-style";
import {
  type EmailHeroBackgroundMode,
  type EmailHeroGradientStyle,
  gradientPreset,
} from "@/modules/communications/invite-hero-background";

export function InviteHeroLivePreview({
  enabled,
  backgroundMode,
  gradientStyle,
  blur = 6,
  focalX = 50,
  focalY = 50,
  accentColor,
  bannerUrl,
  bannerPreviewUrl,
  logoUrl,
  eyebrow,
  title,
  eventName,
  detailLines,
  closing,
  savedHeroUrl,
  headingColor = "#FFFFFF",
  headingFont = "inter",
  headingSize = "md",
}: {
  enabled: boolean;
  backgroundMode: EmailHeroBackgroundMode;
  gradientStyle: EmailHeroGradientStyle;
  /** Soft blur behind copy when mode is Photo (0–24). */
  blur?: number;
  focalX?: number;
  focalY?: number;
  accentColor: string;
  bannerUrl: string | null;
  /** Local object URL while a file is selected but not yet uploaded */
  bannerPreviewUrl?: string | null;
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
}) {
  if (!enabled) {
    return (
      <p className="rounded-xl bg-slate-50 px-4 py-8 text-center text-sm text-slate-600">
        Turn on the invitation hero to preview the composed graphic.
      </p>
    );
  }

  const displayTitle = title.trim() || eventName;
  const displayEyebrow = eyebrow.trim() || "You are invited to";
  const displayClosing = closing.trim();
  const photoSrc = bannerPreviewUrl || bannerUrl;
  const gradient = gradientPreset(gradientStyle);
  const objectPosition = `${focalX}% ${focalY}%`;
  const titleClass =
    headingSize === "sm"
      ? "text-xl"
      : headingSize === "lg"
        ? "text-3xl"
        : "text-2xl";

  let backgroundStyle: CSSProperties = {
    backgroundColor: accentColor,
  };
  if (backgroundMode === "IMAGE" && photoSrc) {
    backgroundStyle = {
      backgroundImage: `url(${photoSrc})`,
      backgroundSize: "cover",
      backgroundPosition: objectPosition,
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
              transform: blur > 0 ? "scale(1.08)" : undefined,
            }}
            aria-hidden
          />
        ) : null}
        <div
          className="absolute inset-0 bg-gradient-to-b from-black/25 via-black/35 to-black/55"
          aria-hidden
        />
        <div
          className="relative flex h-full flex-col items-center px-6 pb-10 pt-9 text-center"
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
          <div className="flex min-h-0 flex-1 flex-col items-center justify-evenly py-4">
            <div>
              <p className="text-sm font-medium opacity-90">{displayEyebrow}</p>
              <p
                className={`mt-3 font-bold leading-tight tracking-tight ${titleClass}`}
              >
                {displayTitle}
              </p>
            </div>
            {detailLines.length > 0 ? (
              <div>
                <div
                  className="mx-auto mb-4 h-0.5 w-24 opacity-80"
                  style={{ backgroundColor: headingColor }}
                />
                <div className="space-y-1 text-sm font-medium opacity-95">
                  {detailLines.map((line) => (
                    <p key={line}>{line}</p>
                  ))}
                </div>
              </div>
            ) : (
              <div aria-hidden />
            )}
            {displayClosing ? (
              <p className="text-sm italic opacity-85">{displayClosing}</p>
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
