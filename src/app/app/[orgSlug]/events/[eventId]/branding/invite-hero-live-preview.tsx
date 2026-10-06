"use client";

import type { CSSProperties } from "react";
import {
  type EmailHeroBackgroundMode,
  type EmailHeroGradientStyle,
  gradientPreset,
} from "@/modules/communications/invite-hero-background";

export function InviteHeroLivePreview({
  enabled,
  backgroundMode,
  gradientStyle,
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
}: {
  enabled: boolean;
  backgroundMode: EmailHeroBackgroundMode;
  gradientStyle: EmailHeroGradientStyle;
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

  let backgroundStyle: CSSProperties = {
    backgroundColor: accentColor,
  };
  if (backgroundMode === "IMAGE" && photoSrc) {
    backgroundStyle = {
      backgroundImage: `url(${photoSrc})`,
      backgroundSize: "cover",
      backgroundPosition: "center",
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
            className="absolute inset-0 backdrop-blur-sm"
            style={{
              backgroundImage: `url(${photoSrc})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              filter: "blur(12px) brightness(0.75)",
              transform: "scale(1.08)",
            }}
            aria-hidden
          />
        ) : null}
        <div
          className="absolute inset-0 bg-gradient-to-b from-black/25 via-black/35 to-black/55"
          aria-hidden
        />
        <div className="relative flex h-full flex-col items-center justify-center px-6 py-10 text-center text-white">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoUrl}
              alt=""
              className="mb-6 max-h-14 max-w-[200px] object-contain drop-shadow-md"
            />
          ) : null}
          <p className="text-sm font-medium text-white/90">{displayEyebrow}</p>
          <p className="mt-3 text-2xl font-bold leading-tight tracking-tight">
            {displayTitle}
          </p>
          {detailLines.length > 0 ? (
            <>
              <div className="my-5 h-0.5 w-24 rounded-full bg-white/80" />
              <div className="space-y-1 text-sm font-medium text-white/95">
                {detailLines.map((line) => (
                  <p key={line}>{line}</p>
                ))}
              </div>
            </>
          ) : null}
          {displayClosing ? (
            <p className="mt-6 text-sm italic text-white/85">{displayClosing}</p>
          ) : null}
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
