"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

export const SETTINGS_TABS = [
  { id: "general", label: "General" },
  { id: "integrations", label: "Integrations" },
  { id: "members", label: "Members" },
  { id: "billing", label: "Billing" },
] as const;

export type SettingsTabId = (typeof SETTINGS_TABS)[number]["id"];

export function SettingsTabs({
  orgSlug,
  active,
}: {
  orgSlug: string;
  active: SettingsTabId;
}) {
  const searchParams = useSearchParams();

  function hrefFor(tab: SettingsTabId) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tab);
    if (tab !== "integrations") {
      params.delete("hubspot");
      params.delete("salesforce");
    }
    return `/app/${orgSlug}/settings?${params.toString()}`;
  }

  return (
    <nav
      className="mb-7 flex gap-7 border-b border-stone-200"
      aria-label="Organisation settings sections"
    >
      {SETTINGS_TABS.map((tab) => {
        const isActive = tab.id === active;
        return (
          <Link
            key={tab.id}
            href={hrefFor(tab.id)}
            className={cn(
              "pb-3 text-[0.9375rem] font-semibold transition-colors",
              isActive
                ? "border-b-2 border-ink-700 text-ink-700"
                : "border-b-2 border-transparent text-stone-500 hover:text-ink-500",
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
