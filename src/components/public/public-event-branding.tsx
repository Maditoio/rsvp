import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { EmailBranding } from "@/modules/communications/email-branding";

export type PublicBrandTokens = Pick<
  EmailBranding,
  "accentColor" | "accentSoft" | "accentBorder" | "logoUrl" | "bannerUrl"
>;

export function publicBrandStyle(branding: PublicBrandTokens): CSSProperties {
  return {
    ["--brand-accent" as string]: branding.accentColor,
    ["--brand-accent-soft" as string]: branding.accentSoft,
    ["--brand-accent-border" as string]: branding.accentBorder,
  };
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
  const hasBanner = Boolean(branding.bannerUrl);

  if (hasBanner) {
    return (
      <section
        className={cn(
          "overflow-hidden rounded-xl bg-white shadow-sm",
          className,
        )}
        style={publicBrandStyle(branding)}
      >
        <div className="relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={branding.bannerUrl ?? ""}
            alt=""
            className="h-44 w-full object-cover sm:h-52"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/35 to-black/10" />
          <div className="absolute inset-x-0 bottom-0 space-y-2 p-5 sm:p-6">
            {branding.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={branding.logoUrl}
                alt=""
                className="mb-1 max-h-10 max-w-[160px] object-contain"
              />
            ) : null}
            {eyebrow ? (
              <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.06em] text-white/80">
                {eyebrow}
              </p>
            ) : null}
            <h1 className="text-3xl font-semibold tracking-[-0.02em] text-white sm:text-4xl">
              {title}
            </h1>
            {description ? (
              <div className="text-sm text-white/90 sm:text-base">{description}</div>
            ) : null}
            {children}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section
      className={cn("rounded-xl p-6 text-white shadow-sm", className)}
      style={{
        ...publicBrandStyle(branding),
        backgroundColor: branding.accentColor,
        boxShadow: `0 4px 12px ${branding.accentColor}47`,
      }}
    >
      {branding.logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={branding.logoUrl}
          alt=""
          className="mb-4 max-h-12 max-w-[180px] object-contain"
        />
      ) : null}
      {eyebrow ? (
        <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.06em] text-white/75">
          {eyebrow}
        </p>
      ) : null}
      <h1 className="mt-2 text-3xl font-semibold tracking-[-0.02em] sm:text-4xl">
        {title}
      </h1>
      {description ? (
        <div className="mt-2 text-sm text-white/90 sm:text-base">{description}</div>
      ) : null}
      {children}
    </section>
  );
}
