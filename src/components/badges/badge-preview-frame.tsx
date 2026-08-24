"use client";

import type { ReactNode } from "react";
import type { BadgeTemplate } from "@/modules/badges/templates";

const MM_TO_PX = 3.7795275591;

export function badgePreviewScale(
  template: BadgeTemplate,
  maxWidthPx: number,
  maxHeightPx: number,
) {
  const widthPx = template.widthMm * MM_TO_PX;
  const heightPx = template.heightMm * MM_TO_PX;
  return Math.min(maxWidthPx / widthPx, maxHeightPx / heightPx, 1);
}

export function BadgePreviewFrame({
  template,
  scale,
  children,
  className,
}: {
  template: BadgeTemplate;
  scale?: number;
  children: ReactNode;
  className?: string;
}) {
  const resolvedScale =
    scale ?? badgePreviewScale(template, 340, 520);
  const widthPx = template.widthMm * MM_TO_PX;
  const heightPx = template.heightMm * MM_TO_PX;

  return (
    <div
      className={className}
      style={{
        width: widthPx * resolvedScale,
        height: heightPx * resolvedScale,
      }}
    >
      <div
        className="origin-top-left"
        style={{
          width: `${template.widthMm}mm`,
          height: `${template.heightMm}mm`,
          transform: `scale(${resolvedScale})`,
        }}
      >
        {children}
      </div>
    </div>
  );
}
