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
import { NavLink } from "@/components/nav-link";
import { cn } from "@/lib/utils";

const portalItems = [
  { href: "/me", label: "My events", icon: Calendar },
  { href: "/me/profile", label: "My profile", icon: User },
  { href: "/me/account", label: "Account", icon: UserCog },
] as const;

function attendeeEventItems(eventId: string) {
  const base = `/me/events/${eventId}`;
  return [
    { href: base, label: "Overview", icon: LayoutDashboard, exact: true },
    { href: `${base}/profile`, label: "Profile", icon: User },
    { href: `${base}/privacy`, label: "Privacy", icon: Shield },
    { href: `${base}/agenda`, label: "Agenda", icon: CalendarDays },
    { href: `${base}/directory`, label: "Directory", icon: BookUser },
    { href: `${base}/matchmaking`, label: "Matching", icon: GitMerge },
    { href: `${base}/meetings`, label: "Meetings", icon: Handshake },
    { href: `${base}/qr`, label: "Check-in code", icon: QrCode },
  ];
}

export function AttendeePortalNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-wrap gap-1 text-sm">
      {portalItems.map((item) => {
        const active =
          item.href === "/me"
            ? pathname === "/me" || pathname.startsWith("/me/events")
            : isNavActive(pathname, item.href);
        return (
          <NavLink
            key={item.href}
            href={item.href}
            label={item.label}
            icon={item.icon}
            active={active}
          />
        );
      })}
    </nav>
  );
}

export function AttendeeEventNav({ eventId }: { eventId: string }) {
  const pathname = usePathname();
  const items = attendeeEventItems(eventId);

  return (
    <nav className="mb-6 flex flex-wrap gap-2">
      {items.map((item) => {
        const active = isNavActive(pathname, item.href, item.exact);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "inline-flex items-center gap-2 rounded-sm border border-stone-200 border-l-[3px] px-3 py-2 text-sm transition-colors",
              active
                ? "border-l-ink-700 bg-stone-100 font-semibold text-ink-700"
                : "border-l-transparent bg-stone-0 text-stone-700 hover:bg-stone-100 hover:text-ink-700",
            )}
          >
            <Icon className="size-4 shrink-0" strokeWidth={1.75} aria-hidden />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function AttendeeEventNavFromPath() {
  const pathname = usePathname();
  const eventId = parseAttendeeEventId(pathname);
  if (!eventId) return null;
  return <AttendeeEventNav eventId={eventId} />;
}
