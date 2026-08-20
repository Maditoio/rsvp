"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookUser,
  Calendar,
  CalendarDays,
  GitMerge,
  Handshake,
  LayoutDashboard,
  QrCode,
  Shield,
  User,
  UserCog,
} from "lucide-react";
import { isNavActive, parseAttendeeEventId } from "@/components/nav";
import { cn } from "@/lib/utils";

const portalItems = [
  { href: "/me", label: "My events", icon: Calendar },
  { href: "/me/profile", label: "My profile", icon: User },
  { href: "/me/account", label: "Account", icon: UserCog },
] as const;

function attendeeEventPrimaryItems(eventId: string) {
  const base = `/me/events/${eventId}`;
  return [
    { href: base, label: "Overview", icon: LayoutDashboard, exact: true },
    { href: `${base}/agenda`, label: "Agenda", icon: CalendarDays },
    { href: `${base}/directory`, label: "Directory", icon: BookUser },
    { href: `${base}/matchmaking`, label: "Matching", icon: GitMerge },
    { href: `${base}/meetings`, label: "Meetings", icon: Handshake },
    { href: `${base}/calendar`, label: "Calendar", icon: Calendar },
  ];
}

function attendeeEventSecondaryItems(eventId: string) {
  const base = `/me/events/${eventId}`;
  return [
    { href: `${base}/profile`, label: "Profile", icon: User },
    { href: `${base}/privacy`, label: "Privacy", icon: Shield },
    { href: `${base}/qr`, label: "Check-in", icon: QrCode },
  ];
}

export function AttendeePortalNav() {
  const pathname = usePathname();

  return (
    <nav className="hidden items-center gap-1 text-sm sm:flex">
      {portalItems.map((item) => {
        const active =
          item.href === "/me"
            ? pathname === "/me"
            : isNavActive(pathname, item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-sm px-2.5 py-1.5 text-stone-600 transition-colors hover:bg-stone-100 hover:text-ink-800",
              active && "bg-stone-100 font-medium text-ink-800",
            )}
          >
            <Icon className="size-3.5 shrink-0" strokeWidth={1.75} aria-hidden />
            <span className="hidden lg:inline">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export function AttendeeEventNav({ eventId }: { eventId: string }) {
  const pathname = usePathname();
  const primary = attendeeEventPrimaryItems(eventId);
  const secondary = attendeeEventSecondaryItems(eventId);

  return (
    <div className="border-t border-stone-200 bg-stone-0">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-6 sm:flex-row sm:items-center sm:justify-between">
        <nav
          className="-mx-2 flex gap-0 overflow-x-auto"
          aria-label="Event sections"
        >
          {primary.map((item) => {
            const active = isNavActive(pathname, item.href, item.exact);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "relative inline-flex shrink-0 items-center gap-2 px-3 py-3.5 text-sm transition-colors",
                  active
                    ? "font-semibold text-bronze-700"
                    : "text-stone-600 hover:text-ink-800",
                )}
              >
                <Icon className="size-4 shrink-0" strokeWidth={1.75} aria-hidden />
                {item.label}
                {active ? (
                  <span
                    className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-bronze-500"
                    aria-hidden
                  />
                ) : null}
              </Link>
            );
          })}
        </nav>
        <nav
          className="hidden items-center gap-1 pb-2 sm:flex sm:pb-0"
          aria-label="Account for this event"
        >
          {secondary.map((item) => {
            const active = isNavActive(pathname, item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-sm px-2 py-1 text-xs text-stone-500 transition-colors hover:bg-stone-100 hover:text-ink-700",
                  active && "bg-stone-100 text-ink-700",
                )}
              >
                <Icon className="size-3.5" strokeWidth={1.75} aria-hidden />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
      {/* Mobile secondary */}
      <nav
        className="flex gap-1 overflow-x-auto border-t border-stone-100 px-4 py-2 sm:hidden"
        aria-label="More for this event"
      >
        {secondary.map((item) => {
          const active = isNavActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "shrink-0 rounded-sm px-2.5 py-1 text-xs text-stone-600",
                active && "bg-stone-100 font-medium text-ink-700",
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

export function AttendeeEventNavFromPath() {
  const pathname = usePathname();
  const eventId = parseAttendeeEventId(pathname);
  if (!eventId) return null;
  return <AttendeeEventNav eventId={eventId} />;
}
