"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { DoorOpen, QrCode, Search } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = (orgSlug: string, eventId: string) =>
  [
    {
      href: `/app/${orgSlug}/events/${eventId}/day`,
      label: "Desk check-in",
      icon: QrCode,
      exact: true,
    },
    {
      href: `/app/${orgSlug}/events/${eventId}/day/entrance`,
      label: "Entrance",
      icon: DoorOpen,
    },
    {
      href: `/app/${orgSlug}/events/${eventId}/day/lookup`,
      label: "Lookup",
      icon: Search,
    },
  ] as const;

export function EventDayShell({
  orgSlug,
  eventId,
  eventName,
  children,
}: {
  orgSlug: string;
  eventId: string;
  eventName: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const items = tabs(orgSlug, eventId);

  return (
    <div className="flex min-h-full flex-col bg-slate-50">
      <header className="bg-white shadow-[0_1px_0_rgba(15,23,42,0.04),0_4px_12px_rgba(15,23,42,0.03)]">
        <div className="px-4 py-5 sm:px-6">
          <p className="text-[0.71875rem] font-semibold uppercase tracking-[0.04em] text-indigo-600">
            Event day
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-[-0.02em] text-slate-900 sm:text-[1.75rem]">
            {eventName}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Desk check-in issues attendance; entrance scans validate the printed
            badge (reprints invalidate old badges).
          </p>
        </div>
        <nav
          className="flex gap-1 border-t border-slate-100 px-4 sm:px-6"
          aria-label="Event day"
        >
          {items.map((item) => {
            const Icon = item.icon;
            const active =
              "exact" in item && item.exact
                ? pathname === item.href
                : pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "relative inline-flex items-center gap-2 rounded-full px-3.5 py-3 text-sm font-medium transition-colors",
                  active
                    ? "text-indigo-700"
                    : "text-slate-600 hover:text-slate-900",
                )}
              >
                <Icon className="size-4 shrink-0" strokeWidth={1.75} aria-hidden />
                {item.label}
                {active ? (
                  <span
                    className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-indigo-600"
                    aria-hidden
                  />
                ) : null}
              </Link>
            );
          })}
        </nav>
      </header>
      <div className="flex-1 px-4 py-6 sm:px-6">{children}</div>
    </div>
  );
}
