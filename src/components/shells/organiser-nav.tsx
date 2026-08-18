"use client";

import { useCallback, useState, useSyncExternalStore, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, Menu, Plug, UserRound, X } from "lucide-react";
import { hasPermission, type Permission } from "@/lib/authz/permissions";
import {
  eventNav,
  isNavActive,
  orgNav,
  parseOrganiserEventId,
} from "@/components/nav";
import { NavLink } from "@/components/nav-link";
import { useEventNav } from "@/components/shells/event-nav-scope";
import { cn } from "@/lib/utils";

const EVENT_NAV_OPEN_KEY = "delegate.event-nav-open";
const eventNavOpenListeners = new Set<() => void>();

function subscribeEventNavOpen(listener: () => void) {
  eventNavOpenListeners.add(listener);
  return () => {
    eventNavOpenListeners.delete(listener);
  };
}

function getEventNavOpenSnapshot() {
  return window.localStorage.getItem(EVENT_NAV_OPEN_KEY) !== "0";
}

function getEventNavOpenServerSnapshot() {
  return true;
}

function usePersistedEventNavOpen() {
  const open = useSyncExternalStore(
    subscribeEventNavOpen,
    getEventNavOpenSnapshot,
    getEventNavOpenServerSnapshot,
  );

  const toggle = useCallback(() => {
    window.localStorage.setItem(EVENT_NAV_OPEN_KEY, open ? "0" : "1");
    eventNavOpenListeners.forEach((listener) => listener());
  }, [open]);

  return [open, toggle] as const;
}

function OrganiserNavList({
  orgSlug,
  grants,
  orgRole,
  onNavigate,
  className,
}: {
  orgSlug: string;
  grants?: Permission[];
  orgRole?: "OWNER" | "ADMIN" | null;
  onNavigate?: () => void;
  className?: string;
}) {
  const pathname = usePathname();
  const { event } = useEventNav();
  const eventId = parseOrganiserEventId(pathname, orgSlug);
  const [eventOpen, toggleEventOpen] = usePersistedEventNavOpen();
  const orgItems = orgNav(orgSlug, grants, orgRole);
  const eventGrants = event?.eventId === eventId ? event.grants : grants;
  const eventItems = eventId
    ? eventNav(orgSlug, eventId).filter(
        (item) => !eventGrants || hasPermission(eventGrants, item.permission),
      )
    : [];

  return (
    <nav className={cn("flex flex-1 flex-col gap-1", className)} onClick={onNavigate}>
      {orgItems.map((item) => (
        <NavLink
          key={item.href}
          href={item.href}
          label={item.label}
          icon={item.icon}
          active={isNavActive(pathname, item.href, item.exact)}
        />
      ))}

      {eventId ? (
        <div className="mt-6">
          <button
            type="button"
            aria-expanded={eventOpen}
            onClick={(eventClick) => {
              eventClick.stopPropagation();
              toggleEventOpen();
            }}
            className="flex w-full items-center justify-between rounded-sm px-3 py-2 text-left text-[0.6875rem] font-semibold uppercase tracking-[0.12em] text-stone-500 hover:bg-stone-100 hover:text-ink-700"
          >
            <span>Event</span>
            <ChevronDown
              className={cn(
                "size-4 shrink-0 transition-transform",
                !eventOpen && "-rotate-90",
              )}
              strokeWidth={1.75}
              aria-hidden
            />
          </button>
          {event?.eventName ? (
            <p className="truncate px-3 pb-2 text-xs text-stone-500">{event.eventName}</p>
          ) : null}
          {eventOpen
            ? eventItems.map((item) => (
                <NavLink
                  key={item.href}
                  href={item.href}
                  label={item.label}
                  icon={item.icon}
                  nested
                  active={isNavActive(pathname, item.href, item.exact)}
                />
              ))
            : null}
        </div>
      ) : null}

      <p className="mt-6 px-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-stone-500">
        Coming later
      </p>
      <span className="flex items-center gap-2 rounded-sm px-3 py-2 text-sm text-stone-400">
        <Plug className="size-4 shrink-0" strokeWidth={1.75} aria-hidden />
        Integrations
      </span>
    </nav>
  );
}

export function OrganiserSidebar({
  orgName,
  orgSlug,
  grants,
  orgRole,
}: {
  orgName: string;
  orgSlug: string;
  grants?: Permission[];
  orgRole?: "OWNER" | "ADMIN" | null;
}) {
  return (
    <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col overflow-y-auto border-r border-stone-200 bg-stone-0 p-6 md:flex">
      <div>
        <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.12em] text-bronze-600">
          Organisation workspace
        </p>
        <Link
          href={`/app/${orgSlug}`}
          className="mt-2 block font-display text-[1.625rem] text-ink-800"
        >
          Bizcon RSVP
        </Link>
        <p className="mt-1 text-sm text-stone-500">{orgName}</p>
      </div>
      <OrganiserNavList className="mt-10" orgSlug={orgSlug} grants={grants} orgRole={orgRole} />
      <Link
        href="/me"
        className="mt-6 flex items-center gap-2 text-sm text-stone-700 hover:text-ink-700"
      >
        <UserRound className="size-4 shrink-0" strokeWidth={1.75} aria-hidden />
        Attendee portal
      </Link>
    </aside>
  );
}

export function OrganiserMobileNav({
  orgName,
  orgSlug,
  grants,
  orgRole,
  trailing,
}: {
  orgName: string;
  orgSlug: string;
  grants?: Permission[];
  orgRole?: "OWNER" | "ADMIN" | null;
  trailing: ReactNode;
}) {
  const pathname = usePathname();
  const [openForPath, setOpenForPath] = useState<string | null>(null);
  const open = openForPath === pathname;

  return (
    <div className="w-full">
      <div className="flex items-start justify-between gap-3">
        <div className="md:hidden">
          <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.12em] text-bronze-600">
            Organisation workspace
          </p>
          <p className="mt-1 text-sm text-ink-700">{orgName}</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            aria-expanded={open}
            aria-label={open ? "Close navigation" : "Open navigation"}
            onClick={() => setOpenForPath(open ? null : pathname)}
            className="rounded-sm p-2 text-ink-700 hover:bg-stone-100 md:hidden"
          >
            {open ? (
              <X className="size-4" strokeWidth={1.75} />
            ) : (
              <Menu className="size-4" strokeWidth={1.75} />
            )}
          </button>
          {trailing}
        </div>
      </div>
      {open ? (
        <div className="mt-4 border-t border-stone-200 pt-4 md:hidden">
          <OrganiserNavList
            orgSlug={orgSlug}
            grants={grants}
            orgRole={orgRole}
            onNavigate={() => setOpenForPath(null)}
          />
          <Link
            href="/me"
            className="mt-4 flex items-center gap-2 px-3 py-2 text-sm text-stone-700 hover:text-ink-700"
          >
            <UserRound className="size-4 shrink-0" strokeWidth={1.75} aria-hidden />
            Attendee portal
          </Link>
        </div>
      ) : null}
    </div>
  );
}
