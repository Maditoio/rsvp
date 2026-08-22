"use client";

import { useState, type ReactNode } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { Menu, Plug, X } from "lucide-react";
import { hasPermission, type Permission } from "@/lib/authz/permissions";
import {
  eventNav,
  isNavActive,
  orgNav,
  parseOrganiserEventId,
} from "@/components/nav";
import { NavLink } from "@/components/nav-link";
import { WorkspaceSwitcher } from "@/components/workspace-switcher";
import type { UserWorkspace } from "@/modules/workspaces/types";
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
  const searchParams = useSearchParams();
  const { event } = useEventNav();
  const eventId = parseOrganiserEventId(pathname, orgSlug);
  const orgItems = orgNav(orgSlug, grants, orgRole);
  const eventGrants = event?.eventId === eventId ? event.grants : grants;
  const eventItems = eventId
    ? eventNav(orgSlug, eventId).filter(
        (item) => !eventGrants || hasPermission(eventGrants, item.permission),
      )
    : [];
  const settingsPath = `/app/${orgSlug}/settings`;
  const integrationsActive =
    pathname === `/app/${orgSlug}/integrations` ||
    (pathname === settingsPath && searchParams.get("tab") === "integrations");

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

      <div className="mt-4">
        <NavLink
          href={`/app/${orgSlug}/settings?tab=integrations`}
          label="Integrations"
          icon={Plug}
          active={integrationsActive}
        />
      </div>
    </nav>
  );
}

export function OrganiserMobileNav({
  orgName,
  orgSlug,
  grants,
  orgRole,
  workspaces = [],
  trailing,
}: {
  orgName: string;
  orgSlug: string;
  grants?: Permission[];
  orgRole?: "OWNER" | "ADMIN" | null;
  workspaces?: UserWorkspace[];
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
          {workspaces.length > 0 ? (
            <WorkspaceSwitcher workspaces={workspaces} compact />
          ) : null}
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
        </div>
      ) : null}
    </div>
  );
}
