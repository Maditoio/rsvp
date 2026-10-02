"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

export const COMMUNICATIONS_TABS = [
  { id: "automations", label: "Automations" },
  { id: "post-event", label: "Post-event" },
  { id: "messages", label: "Messages" },
] as const;

export type CommunicationsTabId = (typeof COMMUNICATIONS_TABS)[number]["id"];

export function parseCommunicationsTab(
  value: string | string[] | undefined,
): CommunicationsTabId {
  const raw = Array.isArray(value) ? value[0] : value;
  if (raw === "post-event" || raw === "messages") return raw;
  return "automations";
}

export function CommunicationsTabs({
  orgSlug,
  eventId,
  active,
}: {
  orgSlug: string;
  eventId: string;
  active: CommunicationsTabId;
}) {
  const searchParams = useSearchParams();

  function hrefFor(tab: CommunicationsTabId) {
    const params = new URLSearchParams(searchParams.toString());
    if (tab === "automations") {
      params.delete("tab");
    } else {
      params.set("tab", tab);
    }
    const query = params.toString();
    return `/app/${orgSlug}/events/${eventId}/communications${query ? `?${query}` : ""}`;
  }

  return (
    <nav
      className="flex flex-wrap gap-x-7 gap-y-2 border-b border-slate-200"
      aria-label="Communications sections"
    >
      {COMMUNICATIONS_TABS.map((tab) => {
        const isActive = tab.id === active;
        return (
          <Link
            key={tab.id}
            href={hrefFor(tab.id)}
            className={cn(
              "pb-3 text-[0.9375rem] font-semibold transition-colors",
              isActive
                ? "border-b-2 border-indigo-600 text-slate-900"
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
