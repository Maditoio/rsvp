"use client";

import { useEffect } from "react";
import type { BadgePrintPayload } from "@/modules/badges/print-payload";
import { BadgeCard } from "@/components/badges/badge-card";
import { Button } from "@/components/ui/button";

export function BadgePrintView({
  badges,
  autoPrint,
}: {
  badges: BadgePrintPayload[];
  autoPrint?: boolean;
}) {
  const pageSize = badges[0]?.template.pageSize ?? "101.6mm 76.2mm";
  const widthMm = badges[0]?.template.widthMm ?? 101.6;
  const heightMm = badges[0]?.template.heightMm ?? 76.2;

  useEffect(() => {
    if (autoPrint) {
      const t = window.setTimeout(() => window.print(), 400);
      return () => window.clearTimeout(t);
    }
  }, [autoPrint]);

  if (badges.length === 0) {
    return (
      <p className="p-8 text-sm text-slate-600">No badges available to print.</p>
    );
  }

  return (
    <div className="badge-print-view mx-auto max-w-3xl px-4 py-8">
      <div className="no-print mb-6 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-600">
          {badges.length} badge{badges.length === 1 ? "" : "s"} ·{" "}
          {badges[0]!.template.name}
        </p>
        <Button type="button" onClick={() => window.print()}>
          Print
        </Button>
      </div>

      <div className="flex flex-col items-center gap-4">
        {badges.map((badge) => (
          <div
            key={badge.attendeeId}
            style={{ width: `${widthMm}mm`, height: `${heightMm}mm` }}
          >
            <BadgeCard badge={badge} />
          </div>
        ))}
      </div>

      <style jsx global>{`
        @page {
          size: ${pageSize};
          margin: 0;
        }
        @media print {
          .no-print {
            display: none !important;
          }
          body {
            background: white !important;
          }
          .badge-print-view {
            padding: 0 !important;
            max-width: none !important;
          }
          .badge-card {
            box-shadow: none !important;
            border-radius: 0 !important;
            page-break-after: always;
            height: 100% !important;
          }
          .badge-card:last-child {
            page-break-after: auto;
          }
        }
      `}</style>
    </div>
  );
}
