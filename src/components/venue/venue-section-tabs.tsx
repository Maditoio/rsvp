import Link from "next/link";
import { cn } from "@/lib/utils";

export const VENUE_SECTIONS = [
  { id: "floors", label: "Floor plans" },
  { id: "insights", label: "Map insights" },
] as const;

export type VenueSectionId = (typeof VENUE_SECTIONS)[number]["id"];

export function venueSectionHref(
  orgSlug: string,
  eventId: string,
  section: VenueSectionId,
) {
  const base = `/app/${orgSlug}/events/${eventId}/venue`;
  if (section === "floors") return base;
  return `${base}?section=insights`;
}

export function VenueSectionTabs({
  orgSlug,
  eventId,
  active,
}: {
  orgSlug: string;
  eventId: string;
  active: VenueSectionId;
}) {
  return (
    <nav
      className="rounded-xl bg-white px-4 pt-3 shadow-sm"
      aria-label="Venue sections"
    >
      <div className="flex flex-wrap gap-x-7 gap-y-2 border-b border-slate-200">
        {VENUE_SECTIONS.map((tab) => {
          const isActive = tab.id === active;
          return (
            <Link
              key={tab.id}
              href={venueSectionHref(orgSlug, eventId, tab.id)}
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
      </div>
    </nav>
  );
}
