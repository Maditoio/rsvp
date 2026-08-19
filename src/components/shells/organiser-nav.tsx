"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, Plug, UserRound, X } from "lucide-react";
import { hasPermission, type Permission } from "@/lib/authz/permissions";
import {
  eventNav,
  isNavActive,
  orgNav,
  parseOrganiserEventId,
} from "@/components/nav";
import { NavLink } from "@/components/nav-link";
import { useEventNav } from "@/components/shells/event-nav-scope";

/** Flat list used only for the mobile/small-screen drawer. */
function MobileNavList({
  orgSlug,
  grants,
  orgRole,
  onNavigate,
}: {
  orgSlug: string;
  grants?: Permission[];
  orgRole?: "OWNER" | "ADMIN" | null;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const { event } = useEventNav();
  const eventId = parseOrganiserEventId(pathname, orgSlug);
  const orgItems = orgNav(orgSlug, grants, orgRole);
  const eventGrants = event?.eventId === eventId ? event.grants : grants;
  const eventItems = eventId
    ? eventNav(orgSlug, eventId).filter(
        (item) => !eventGrants || hasPermission(eventGrants, item.permission),
      )
    : [];

  return (
    <nav className="flex flex-1 flex-col gap-1" onClick={onNavigate}>
      {orgItems.map((item) => (
        <NavLink
          key={item.href}
          href={item.href}
          label={item.label}
          icon={item.icon}
          active={isNavActive(pathname, item.href, item.exact)}
        />
      ))}

      {eventItems.length > 0 && (
        <div className="mt-4">
          <p className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-stone-400">
            {event?.eventName ?? "Event"}
          </p>
          {eventItems.map((item) => (
            <NavLink
              key={item.href}
              href={item.href}
              label={item.label}
              icon={item.icon}
              active={isNavActive(pathname, item.href, item.exact)}
            />
          ))}
        </div>
      )}

      <span className="mt-4 flex items-center gap-2 rounded-sm px-3 py-2 text-sm text-stone-400">
        <Plug className="size-4 shrink-0" strokeWidth={1.75} aria-hidden />
        Integrations
      </span>
    </nav>
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
          <MobileNavList
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
