"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

export const MEETINGS_TABS = [
  { id: "all", label: "All meetings" },
  { id: "today", label: "Today" },
  { id: "unscheduled", label: "Unscheduled" },
  { id: "conflicts", label: "Conflicts" },
  { id: "suggestions", label: "Suggested pairings" },
  { id: "heatmap", label: "Slot heatmap" },
  { id: "room-list", label: "Rooms" },
  { id: "rooms", label: "Room board" },
  { id: "moderation", label: "Moderation" },
] as const;

export type MeetingsTabId = (typeof MEETINGS_TABS)[number]["id"];

export function MeetingsTabs({
  orgSlug,
  eventId,
  active,
  counts,
}: {
  orgSlug: string;
  eventId: string;
  active: MeetingsTabId;
  counts: {
    unscheduled: number;
    conflicts: number;
    suggestions: number;
    moderation: number;
    today: number;
  };
}) {
  const searchParams = useSearchParams();

  function hrefFor(tab: MeetingsTabId) {
    const params = new URLSearchParams(searchParams.toString());
    if (tab === "all") {
      params.delete("tab");
    } else {
      params.set("tab", tab);
    }
    const query = params.toString();
    return `/app/${orgSlug}/events/${eventId}/meetings${query ? `?${query}` : ""}`;
  }

  function badgeFor(tab: MeetingsTabId) {
    switch (tab) {
      case "unscheduled":
        return counts.unscheduled;
      case "conflicts":
        return counts.conflicts;
      case "suggestions":
        return counts.suggestions;
      case "moderation":
        return counts.moderation;
      case "today":
        return counts.today;
      default:
        return 0;
    }
  }

  return (
    <nav
      className="flex flex-wrap gap-x-7 gap-y-2 border-b border-slate-200"
      aria-label="Meetings sections"
    >
      {MEETINGS_TABS.map((tab) => {
        const isActive = tab.id === active;
        const badge = badgeFor(tab.id);
        return (
          <Link
            key={tab.id}
            href={hrefFor(tab.id)}
            className={cn(
              "inline-flex items-center gap-2 pb-3 text-[0.9375rem] font-semibold transition-colors",
              isActive
                ? "border-b-2 border-indigo-600 text-slate-900"
                : "border-b-2 border-transparent text-slate-500 hover:text-slate-900",
            )}
            aria-current={isActive ? "page" : undefined}
          >
            {tab.label}
            {badge > 0 ? (
              <span
                className={cn(
                  "inline-flex min-w-5 items-center justify-center rounded-full px-1.5 py-0.5 text-[0.6875rem] font-semibold tabular-nums",
                  tab.id === "conflicts" || tab.id === "moderation"
                    ? "bg-danger-bg text-danger"
                    : "bg-slate-100 text-slate-600",
                )}
              >
                {badge}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
