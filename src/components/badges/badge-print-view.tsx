"use client";

import { useEffect, useRef } from "react";
import type { BadgePrintPayload } from "@/modules/badges/print-payload";
import { BadgeCard } from "@/components/badges/badge-card";
import { Button } from "@/components/ui/button";

async function waitForBadgeAssets(root: HTMLElement) {
  const images = Array.from(root.querySelectorAll("img"));
  await Promise.all(
    images.map(
      (img) =>
        new Promise<void>((resolve) => {
          if (img.complete) {
            resolve();
            return;
          }
          img.addEventListener("load", () => resolve(), { once: true });
          img.addEventListener("error", () => resolve(), { once: true });
        }),
    ),
  );

  // Background images on .badge-card are CSS — give the browser a frame to paint.
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });
}

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
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.documentElement.classList.add("badge-print-route");
    document.body.classList.add("badge-print-route");
    return () => {
      document.documentElement.classList.remove("badge-print-route");
      document.body.classList.remove("badge-print-route");
    };
  }, []);

  useEffect(() => {
    if (!autoPrint || !rootRef.current) return;
    let cancelled = false;
    let timeoutId: number | undefined;

    void (async () => {
      await waitForBadgeAssets(rootRef.current!);
      if (cancelled) return;
      timeoutId = window.setTimeout(() => window.print(), 200);
    })();

    return () => {
      cancelled = true;
      if (timeoutId !== undefined) window.clearTimeout(timeoutId);
    };
  }, [autoPrint]);

  if (badges.length === 0) {
    return (
      <p className="p-8 text-sm text-slate-600">No badges available to print.</p>
    );
  }

  return (
    <div ref={rootRef} className="badge-print-view mx-auto max-w-3xl px-4 py-8">
      <div className="no-print mb-6 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-600">
          {badges.length} badge{badges.length === 1 ? "" : "s"} ·{" "}
          {badges[0]!.template.name}
        </p>
        <Button type="button" onClick={() => window.print()}>
          Print
        </Button>
      </div>

      <div className="badge-print-sheets flex flex-col items-center gap-4">
        {badges.map((badge) => (
          <div
            key={badge.attendeeId}
            className="badge-print-sheet"
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

        html.badge-print-route,
        body.badge-print-route {
          background: #f1f5f9 !important;
        }

        .badge-card {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
          color-adjust: exact !important;
        }

        @media print {
          .no-print {
            display: none !important;
          }

          html.badge-print-route,
          body.badge-print-route,
          .badge-print-document {
            background: white !important;
            margin: 0 !important;
            padding: 0 !important;
            height: auto !important;
            overflow: visible !important;
          }

          .badge-print-view {
            padding: 0 !important;
            margin: 0 !important;
            max-width: none !important;
          }

          .badge-print-sheets {
            gap: 0 !important;
          }

          .badge-print-sheet {
            width: ${widthMm}mm !important;
            height: ${heightMm}mm !important;
            page-break-after: always;
            break-after: page;
          }

          .badge-print-sheet:last-child {
            page-break-after: auto;
            break-after: auto;
          }

          .badge-card {
            box-shadow: none !important;
            border-radius: 0 !important;
            height: 100% !important;
            width: 100% !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
        }
      `}</style>
    </div>
  );
}
