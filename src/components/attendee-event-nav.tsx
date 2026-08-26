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
  ListChecks,
  MapPinned,
  QrCode,
  User,
} from "lucide-react";
import { useAttendeeAttention } from "@/components/attendee-attention-context";
import { isNavActive, parseAttendeeEventId } from "@/components/nav";
import { cn } from "@/lib/utils";

function attendeeEventPrimaryItems(eventId: string) {
  const base = `/me/events/${eventId}`;
  return [
    { href: base, label: "Overview", icon: LayoutDashboard, exact: true },
    { href: `${base}/agenda`, label: "Agenda", icon: CalendarDays },
    { href: `${base}/map`, label: "Map", icon: MapPinned },
    { href: `${base}/directory`, label: "Directory", icon: BookUser },
    { href: `${base}/matchmaking`, label: "Matching", icon: GitMerge },
    { href: `${base}/meetings`, label: "Meetings", icon: Handshake },
    { href: `${base}/polls`, label: "Polls", icon: ListChecks },
    { href: `${base}/calendar`, label: "Calendar", icon: Calendar },
  ];
}

function attendeeEventSecondaryItems(eventId: string) {
  const base = `/me/events/${eventId}`;
  return [
    { href: `${base}/profile`, label: "Profile", icon: User },
    { href: `${base}/qr`, label: "Check-in", icon: QrCode },
  ];
}

function isProfileSectionActive(pathname: string, eventId: string) {
  const base = `/me/events/${eventId}`;
  return (
    pathname === `${base}/profile` ||
    pathname.startsWith(`${base}/privacy`) ||
    pathname.startsWith(`${base}/matchmaking`)
  );
}

export function AttendeeEventNav({ eventId }: { eventId: string }) {
  const pathname = usePathname();
  const { inbox } = useAttendeeAttention();
  const pendingMeetings = inbox?.pendingRequestCount ?? 0;
  const primary = attendeeEventPrimaryItems(eventId);
  const secondary = attendeeEventSecondaryItems(eventId);

  return (
    <div className="border-t border-slate-200 bg-white">
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
                    ? "font-semibold text-indigo-700"
                    : "text-slate-600 hover:text-slate-900",
                )}
              >
                <Icon className="size-4 shrink-0" strokeWidth={1.75} aria-hidden />
                {item.label}
                {item.href.endsWith("/meetings") && pendingMeetings > 0 ? (
                  <span className="ml-1 inline-flex min-w-[1.125rem] items-center justify-center rounded-full bg-indigo-600 px-1.5 text-[0.6875rem] font-semibold tabular-nums text-white">
                    {pendingMeetings > 9 ? "9+" : pendingMeetings}
                  </span>
                ) : null}
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
        <nav
          className="hidden items-center gap-1 pb-2 sm:flex sm:pb-0"
          aria-label="Account for this event"
        >
          {secondary.map((item) => {
            const active =
              item.href.endsWith("/profile")
                ? isProfileSectionActive(pathname, eventId)
                : isNavActive(pathname, item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700",
                  active && "bg-slate-100 text-slate-700",
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
        className="flex gap-1 overflow-x-auto border-t border-slate-100 px-4 py-2 sm:hidden"
        aria-label="More for this event"
      >
        {secondary.map((item) => {
          const active =
            item.href.endsWith("/profile")
              ? isProfileSectionActive(pathname, eventId)
              : isNavActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "shrink-0 rounded-full px-2.5 py-1 text-xs text-slate-600",
                active && "bg-slate-100 font-medium text-slate-700",
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
