"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  EVENT_SETTINGS_TABS,
  type EventSettingsTabId,
} from "./event-settings-tab-types";

export function EventSettingsTabs({
  orgSlug,
  eventId,
  active,
}: {
  orgSlug: string;
  eventId: string;
  active: EventSettingsTabId;
}) {
  const searchParams = useSearchParams();

  function hrefFor(tab: EventSettingsTabId) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tab);
    return `/app/${orgSlug}/events/${eventId}/settings?${params.toString()}`;
  }

  return (
    <nav
      className="mb-7 flex gap-7 border-b border-slate-200"
      aria-label="Event settings sections"
    >
      {EVENT_SETTINGS_TABS.map((tab) => {
        const isActive = tab.id === active;
        return (
          <Link
            key={tab.id}
            href={hrefFor(tab.id)}
            className={cn(
              "pb-3 text-[0.9375rem] font-semibold transition-colors",
              isActive
                ? "border-b-2 border-slate-900 text-slate-900"
                : "border-b-2 border-transparent text-slate-500 hover:text-slate-900",
            )}
            aria-current={isActive ? "page" : undefined}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
