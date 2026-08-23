"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  LogOut,
  Plug,
  Settings,
  UserRound,
} from "lucide-react";
import { useClerk } from "@clerk/nextjs";
import type { Permission } from "@/lib/authz/permissions";
import { orgPrimaryNav, isNavActive } from "@/components/nav";
import { NavLink } from "@/components/nav-link";
import { BrandLogo, BrandMark } from "@/components/brand-logo";
import { WorkspaceSwitcher } from "@/components/workspace-switcher";
import type { UserWorkspace } from "@/modules/workspaces/types";
import { cn } from "@/lib/utils";

/* ── Persisted collapse state ── */

const STORAGE_KEY = "delegate.orgRailCollapsed";
const listeners = new Set<() => void>();

function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}
function getSnapshot() {
  return window.localStorage.getItem(STORAGE_KEY) === "1";
}
function getServerSnapshot() {
  return false;
}

/** Collapse/expand the organisation rail (sidenav 1). */
export function setOrgRailCollapsed(collapsed: boolean) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, collapsed ? "1" : "0");
  listeners.forEach((fn) => fn());
}

export function useOrgRailCollapsed() {
  const collapsed = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const toggle = useCallback(() => {
    setOrgRailCollapsed(!collapsed);
  }, [collapsed]);
  return [collapsed, toggle] as const;
}

/* ── Account popover ── */

function AccountPopover({
  orgSlug,
  orgRole,
  collapsed,
}: {
  orgSlug: string;
  orgRole?: "OWNER" | "ADMIN" | null;
  collapsed: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const { signOut, user } = useClerk();

  useEffect(() => {
    if (collapsed) setOpen(false);
  }, [collapsed]);

  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const email = user?.primaryEmailAddress?.emailAddress;
  const initials = user
    ? `${(user.firstName ?? "")[0] ?? ""}${(user.lastName ?? "")[0] ?? ""}`.toUpperCase() ||
      "U"
    : "U";

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => {
          // Collapsed rail: expand first so the menu isn't hidden behind the event nav.
          if (collapsed) {
            setOrgRailCollapsed(false);
            setOpen(true);
            return;
          }
          setOpen((value) => !value);
        }}
        className={cn(
          "flex w-full items-center gap-2 rounded-full text-sm text-slate-600 hover:bg-slate-100 hover:text-slate-900",
          collapsed
            ? "mx-auto size-[38px] justify-center"
            : "h-[38px] px-2",
        )}
        title={collapsed ? (email ?? "Account") : undefined}
        aria-expanded={open}
      >
        <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-400 to-indigo-600 text-[10px] font-semibold text-white">
          {initials}
        </span>
        {!collapsed && (
          <>
            <span className="min-w-0 flex-1 truncate text-left">
              {email ?? "Account"}
            </span>
            <ChevronUp
              className={cn(
                "size-3 shrink-0 text-slate-400 transition-transform",
                open && "rotate-180",
              )}
              strokeWidth={2}
            />
          </>
        )}
      </button>

      {open && !collapsed ? (
        <div className="absolute bottom-full left-0 z-20 mb-1 w-52 rounded-md bg-white py-1.5 shadow-md">
          {email && (
            <div className="border-b border-slate-100 px-3 py-2">
              <p className="truncate text-xs font-medium text-slate-900">
                {user?.fullName ?? email}
              </p>
              <p className="truncate text-[11px] text-slate-500">{email}</p>
            </div>
          )}
          <Link
            href="/home"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-slate-900"
          >
            <UserRound className="size-3.5" strokeWidth={1.75} />
            All workspaces
          </Link>
          {orgRole != null && (
            <Link
              href={`/app/${orgSlug}/settings`}
              onClick={() => setOpen(false)}
              className={cn(
                "flex items-center gap-2 px-3 py-2 text-sm hover:bg-slate-50",
                isNavActive(pathname, `/app/${orgSlug}/settings`)
                  ? "font-medium text-slate-900"
                  : "text-slate-700 hover:text-slate-900",
              )}
            >
              <Settings className="size-3.5" strokeWidth={1.75} />
              Organisation settings
            </Link>
          )}
          <div className="border-t border-slate-100">
            <button
              type="button"
              onClick={() => signOut()}
              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-slate-900"
            >
              <LogOut className="size-3.5" strokeWidth={1.75} />
              Sign out
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

/* ── Component ── */

export function OrgRail({
  orgName,
  orgSlug,
  grants,
  orgRole,
  workspaces = [],
}: {
  orgName: string;
  orgSlug: string;
  grants?: Permission[];
  orgRole?: "OWNER" | "ADMIN" | null;
  workspaces?: UserWorkspace[];
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [collapsed, toggle] = useOrgRailCollapsed();
  const primary = useMemo(() => orgPrimaryNav(orgSlug, grants), [orgSlug, grants]);
  const settingsPath = `/app/${orgSlug}/settings`;
  const integrationsActive =
    pathname === `/app/${orgSlug}/integrations` ||
    (pathname === settingsPath && searchParams.get("tab") === "integrations");

  useEffect(() => {
    if (window.localStorage.getItem(STORAGE_KEY) !== null) return;
    if (window.innerWidth < 1280) {
      setOrgRailCollapsed(true);
    }
  }, []);

  return (
    <aside
      className={cn(
        "relative hidden h-full shrink-0 flex-col bg-white shadow-[2px_0_12px_rgba(15,23,42,0.03)] transition-[width] duration-[220ms] ease-out md:flex motion-reduce:transition-none",
        collapsed ? "w-16" : "w-[220px]",
      )}
      style={{ willChange: "width" }}
    >
      {/* Toggle — Aurora floating ghost icon button on the rail edge */}
      <button
        type="button"
        onClick={toggle}
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        className={cn(
          "absolute -right-[18px] top-5 z-10 inline-flex size-9 items-center justify-center rounded-full",
          "bg-white text-slate-500 shadow-md",
          "transition-[color,background-color,box-shadow,transform] duration-150 ease-out",
          "hover:bg-indigo-50 hover:text-indigo-600 hover:shadow-accent",
          "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-500/12",
          "active:scale-95",
        )}
      >
        {collapsed ? (
          <ChevronRight className="size-4" strokeWidth={2} />
        ) : (
          <ChevronLeft className="size-4" strokeWidth={2} />
        )}
      </button>

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden">
      {/* Header */}
      <div className="p-5 pr-6">
        {collapsed ? (
          <Link href={`/app/${orgSlug}`} className="mx-auto block w-fit">
            <BrandMark size={34} />
          </Link>
        ) : (
          <>
            <BrandLogo
              href={`/app/${orgSlug}`}
              wordmark="Bizcon"
              size={28}
              wordmarkClassName="text-[21px] font-bold tracking-[-0.02em] text-slate-900"
            />
            <p className="mt-1 truncate text-xs text-slate-500" title={orgName}>
              {orgName}
            </p>
          </>
        )}
      </div>

      {/* Primary nav */}
      <nav className="flex min-w-0 flex-1 flex-col gap-1 p-3">
        {primary.map((item) => (
          <NavLink
            key={item.href}
            href={item.href}
            label={item.label}
            icon={item.icon}
            active={isNavActive(pathname, item.href, item.exact)}
            collapsed={collapsed}
          />
        ))}
      </nav>

      {/* Footer */}
      <div className="mt-auto border-t border-slate-100 p-3 pb-3">
        {!collapsed && workspaces.length > 0 ? (
          <div className="mb-2 px-1">
            <WorkspaceSwitcher workspaces={workspaces} compact />
          </div>
        ) : null}

        <NavLink
          href={`/app/${orgSlug}/settings?tab=integrations`}
          label="Integrations"
          icon={Plug}
          active={integrationsActive}
          collapsed={collapsed}
        />

        <AccountPopover orgSlug={orgSlug} orgRole={orgRole} collapsed={collapsed} />
      </div>
      </div>
    </aside>
  );
}
