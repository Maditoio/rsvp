"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

export const ANALYTICS_SECTIONS = [
  { id: "overview", label: "Overview" },
  { id: "funnel", label: "Funnel" },
  { id: "roi", label: "Matchmaking ROI" },
  { id: "rooms", label: "Room timeline" },
  { id: "categories", label: "Category mix" },
  { id: "gaps", label: "Gap finder" },
  { id: "outcomes", label: "Outcomes" },
] as const;

export type AnalyticsSectionId = (typeof ANALYTICS_SECTIONS)[number]["id"];

export function AnalyticsSectionTabs({
  orgSlug,
  eventId,
  active,
}: {
  orgSlug: string;
  eventId: string;
  active: AnalyticsSectionId;
}) {
  const searchParams = useSearchParams();

  function hrefFor(section: AnalyticsSectionId) {
    const params = new URLSearchParams(searchParams.toString());
    if (section === "overview") {
      params.delete("section");
    } else {
      params.set("section", section);
    }
    const query = params.toString();
    return `/app/${orgSlug}/events/${eventId}/analytics${query ? `?${query}` : ""}`;
  }

  return (
    <nav
      className="flex flex-wrap gap-x-6 gap-y-2 border-b border-slate-200"
      aria-label="Analytics sections"
    >
      {ANALYTICS_SECTIONS.map((tab) => {
        const isActive = tab.id === active;
        return (
          <Link
            key={tab.id}
            href={hrefFor(tab.id)}
            className={cn(
              "pb-3 text-sm font-semibold transition-colors",
              isActive
                ? "border-b-2 border-indigo-600 text-slate-900"
                : "border-b-2 border-transparent text-slate-500 hover:text-slate-900",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
