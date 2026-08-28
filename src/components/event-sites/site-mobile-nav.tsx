"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import type { EventSiteGlobalStyles } from "@/modules/event-sites/theme";
import { SiteButton } from "./site-primitives";
import type { EventSiteRenderData } from "./types";

type SiteMobileNavProps = {
  data: EventSiteRenderData;
  links: { label: string; href: string }[];
  isDark: boolean;
  globalStyles: EventSiteGlobalStyles;
};

export function SiteMobileNav({
  data,
  links,
  isDark,
  globalStyles,
}: SiteMobileNavProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="md:hidden">
      <button
        type="button"
        aria-label="Menu"
        className={cn(
          "inline-flex size-10 items-center justify-center rounded-md",
          isDark ? "text-white" : "text-slate-700",
        )}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="text-xl">{open ? "×" : "☰"}</span>
      </button>
      {open ? (
        <div className="absolute inset-x-0 top-16 border-b border-slate-200 bg-white p-4 shadow-lg">
          <div className="flex flex-col gap-3">
            {links.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-slate-700"
                onClick={() => setOpen(false)}
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
                className="w-full justify-center"
              />
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
