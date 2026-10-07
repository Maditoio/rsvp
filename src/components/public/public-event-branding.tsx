import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { EmailBranding } from "@/modules/communications/email-branding";
import type { PublicBannerBranding } from "@/modules/branding/public-event-branding";

export type PublicBrandTokens = Pick<
  EmailBranding,
  "accentColor" | "accentSoft" | "accentBorder" | "logoUrl" | "bannerUrl"
> & {
  banner?: PublicBannerBranding;
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
  return (
    <div className={cn("space-y-2", onAccent ? "text-white" : "text-slate-900")}>
      {branding.logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={branding.logoUrl}
          alt=""
          className={cn(
            "max-h-12 max-w-[180px] object-contain",
            onAccent ? "mb-3" : "mb-1",
          )}
        />
      ) : null}
      {eyebrow ? (
        <p
          className={cn(
            "text-[0.6875rem] font-semibold uppercase tracking-[0.06em]",
            onAccent ? "text-white/75" : "text-slate-500",
          )}
          style={onAccent ? undefined : { color: branding.accentColor }}
        >
          {eyebrow}
        </p>
      ) : null}
      <h1
        className={cn(
          "text-3xl font-semibold tracking-[-0.02em] sm:text-4xl",
          onAccent ? "text-white" : "text-slate-900",
        )}
      >
        {title}
      </h1>
      {description ? (
        <div
          className={cn(
            "text-sm sm:text-base",
            onAccent ? "text-white/90" : "text-slate-600",
          )}
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
          style={
            blur > 0
              ? {
                  filter: `blur(${blur}px)`,
                  transform: "scale(1.06)",
                }
              : undefined
          }
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
