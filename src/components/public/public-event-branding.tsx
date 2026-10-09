import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { EmailBranding } from "@/modules/communications/email-branding";
import type { PublicBannerBranding } from "@/modules/branding/public-event-branding";
import {
  brandHeadingPublicEyebrowPx,
  brandHeadingPublicTitlePx,
  defaultHeadingColor,
  type BrandHeadingStyle,
} from "@/modules/branding/brand-heading-style";

export type PublicBrandTokens = Pick<
  EmailBranding,
  "accentColor" | "accentSoft" | "accentBorder" | "logoUrl" | "bannerUrl"
> & {
  banner?: PublicBannerBranding;
  heading?: BrandHeadingStyle & {
    cssFamily?: string;
    cssWeight?: number;
    cssTracking?: string;
    cssLineHeight?: number;
    cssTextAlign?: "left" | "center";
  };
};

export function publicBrandStyle(branding: PublicBrandTokens): CSSProperties {
  return {
    ["--brand-accent" as string]: branding.accentColor,
    ["--brand-accent-soft" as string]: branding.accentSoft,
    ["--brand-accent-border" as string]: branding.accentBorder,
  };
}

function HeroCopy({
  branding,
  eyebrow,
  title,
  description,
  children,
  onAccent,
}: {
  branding: PublicBrandTokens;
  eyebrow?: string;
  title: string;
  description?: ReactNode;
  children?: ReactNode;
  onAccent: boolean;
}) {
  const heading = branding.heading;
  const size = heading?.size ?? 54;
  const textColor =
    heading?.color ?? defaultHeadingColor(onAccent);
  const fontFamily = heading?.cssFamily;
  const fontWeight = heading?.cssWeight ?? 700;
  const letterSpacing = heading?.cssTracking ?? "-0.02em";
  const lineHeight = heading?.cssLineHeight ?? 1.18;
  const textAlign = heading?.cssTextAlign ?? "left";
  const eyebrowUppercase = heading?.eyebrowUppercase ?? true;
  const titlePx = brandHeadingPublicTitlePx(size);
  const eyebrowPx = brandHeadingPublicEyebrowPx(size);

  return (
    <div
      className="space-y-2"
      style={{ color: textColor, fontFamily, textAlign }}
    >
      {branding.logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={branding.logoUrl}
          alt=""
          className={cn(
            "max-h-12 max-w-[180px] object-contain",
            onAccent ? "mb-3" : "mb-1",
            textAlign === "center" && "mx-auto",
          )}
        />
      ) : null}
      {eyebrow ? (
        <p
          className={cn("font-semibold", eyebrowUppercase && "uppercase")}
          style={{
            fontSize: eyebrowPx,
            color: heading?.color
              ? textColor
              : onAccent
                ? "rgba(255,255,255,0.75)"
                : branding.accentColor,
            opacity: heading?.color ? 0.85 : undefined,
            letterSpacing:
              heading?.tracking === "wide"
                ? "0.08em"
                : heading?.tracking === "tight"
                  ? "0.04em"
                  : "0.06em",
          }}
        >
          {eyebrow}
        </p>
      ) : null}
      <h1
        style={{
          fontSize: titlePx,
          color: textColor,
          fontFamily,
          fontWeight,
          letterSpacing,
          lineHeight,
        }}
      >
        {title}
      </h1>
      {description ? (
        <div
          className="text-sm sm:text-base"
          style={{
            color: textColor,
            opacity: onAccent || heading?.color ? 0.9 : undefined,
          }}
        >
          {description}
        </div>
      ) : null}
      {children}
    </div>
  );
}

function BannerStrip({
  branding,
}: {
  branding: PublicBrandTokens;
}) {
  const banner = branding.banner;
  const mode = banner?.mode ?? (branding.bannerUrl ? "IMAGE" : "COLOR");

  if (mode === "IMAGE" && (banner?.imageUrl || branding.bannerUrl)) {
    const src = banner?.imageUrl ?? branding.bannerUrl ?? "";
    const blur = banner?.blur ?? 0;
    const zoom = Math.min(200, Math.max(100, banner?.zoom ?? 100));
    const objectPosition = banner?.objectPosition ?? "50% 50%";
    const scale = (zoom / 100) * (blur > 0 ? 1.06 : 1);
    return (
      <div
        className="relative overflow-hidden border-b"
        style={{
          backgroundColor: branding.accentSoft,
          borderColor: branding.accentBorder,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt=""
          className="mx-auto block h-auto w-full max-h-64 object-cover"
          style={{
            objectPosition,
            transform: `scale(${scale})`,
            transformOrigin: objectPosition,
            ...(blur > 0 ? { filter: `blur(${blur}px)` } : {}),
          }}
        />
      </div>
    );
  }

  if (mode === "GRADIENT") {
    return (
      <div
        className="h-28 w-full border-b sm:h-36"
        style={{
          background: banner?.gradientCss ?? branding.accentColor,
          borderColor: branding.accentBorder,
        }}
      />
    );
  }

  // COLOR — soft strip using brand colour
  return (
    <div
      className="h-20 w-full border-b sm:h-28"
      style={{
        backgroundColor: branding.accentColor,
        borderColor: branding.accentBorder,
      }}
    />
  );
}

export function PublicEventHero({
  branding,
  eyebrow,
  title,
  description,
  children,
  className,
}: {
  branding: PublicBrandTokens;
  eyebrow?: string;
  title: string;
  description?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  const hasStructuredBanner = Boolean(branding.banner);
  const hasLegacyPhoto = Boolean(branding.bannerUrl);
  const showStrip = hasStructuredBanner || hasLegacyPhoto;

  // No banner config and no photo → full accent card (legacy).
  if (!showStrip) {
    return (
      <section
        className={cn("rounded-xl p-6 shadow-sm", className)}
        style={{
          ...publicBrandStyle(branding),
          backgroundColor: branding.accentColor,
          boxShadow: `0 4px 12px ${branding.accentColor}47`,
        }}
      >
        <HeroCopy
          branding={branding}
          eyebrow={eyebrow}
          title={title}
          description={description}
          onAccent
        >
          {children}
        </HeroCopy>
      </section>
    );
  }

  return (
    <section
      className={cn(
        "overflow-hidden rounded-xl bg-white shadow-sm",
        className,
      )}
      style={publicBrandStyle(branding)}
    >
      <BannerStrip branding={branding} />
      <div className="p-5 sm:p-6">
        <HeroCopy
          branding={branding}
          eyebrow={eyebrow}
          title={title}
          description={description}
          onAccent={false}
        >
          {children}
        </HeroCopy>
      </div>
    </section>
  );
}
