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
          "flex w-full items-center gap-2 rounded-sm text-sm text-stone-600 hover:bg-stone-100 hover:text-ink-700",
          collapsed
            ? "mx-auto size-[38px] justify-center"
            : "h-[38px] px-2",
        )}
        title={collapsed ? (email ?? "Account") : undefined}
        aria-expanded={open}
      >
        <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-ink-700 text-[10px] font-semibold text-white">
          {initials}
        </span>
        {!collapsed && (
          <>
            <span className="min-w-0 flex-1 truncate text-left">
              {email ?? "Account"}
            </span>
            <ChevronUp
              className={cn(
                "size-3 shrink-0 text-stone-400 transition-transform",
                open && "rotate-180",
              )}
              strokeWidth={2}
            />
          </>
        )}
      </button>

      {open && !collapsed ? (
        <div className="absolute bottom-full left-0 z-20 mb-1 w-52 rounded-md border border-stone-200 bg-white py-1 shadow-lg">
          {email && (
            <div className="border-b border-stone-100 px-3 py-2">
              <p className="truncate text-xs font-medium text-ink-700">
                {user?.fullName ?? email}
              </p>
              <p className="truncate text-[11px] text-stone-500">{email}</p>
            </div>
          )}
          <Link
            href="/me"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 px-3 py-2 text-sm text-stone-700 hover:bg-stone-50 hover:text-ink-700"
          >
            <UserRound className="size-3.5" strokeWidth={1.75} />
            Attendee portal
          </Link>
          {orgRole != null && (
            <Link
              href={`/app/${orgSlug}/settings`}
              onClick={() => setOpen(false)}
              className={cn(
                "flex items-center gap-2 px-3 py-2 text-sm hover:bg-stone-50",
                isNavActive(pathname, `/app/${orgSlug}/settings`)
                  ? "font-medium text-ink-700"
                  : "text-stone-700 hover:text-ink-700",
              )}
            >
              <Settings className="size-3.5" strokeWidth={1.75} />
              Organisation settings
            </Link>
          )}
          <div className="border-t border-stone-100">
            <button
              type="button"
              onClick={() => signOut()}
              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-stone-700 hover:bg-stone-50 hover:text-ink-700"
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
}: {
  orgName: string;
  orgSlug: string;
  grants?: Permission[];
  orgRole?: "OWNER" | "ADMIN" | null;
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
        "relative hidden h-full shrink-0 flex-col overflow-y-auto overflow-x-hidden border-r border-stone-200 bg-stone-0 transition-[width] duration-[220ms] ease-out md:flex motion-reduce:transition-none",
        collapsed ? "w-16" : "w-[220px]",
      )}
      style={{ willChange: "width" }}
    >
      {/* Toggle button */}
      <button
        type="button"
        onClick={toggle}
        className="absolute -right-[11px] top-6 z-10 flex size-[22px] items-center justify-center rounded-full border border-stone-300 bg-white shadow-sm"
        title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {collapsed ? (
          <ChevronRight className="size-3 text-stone-600" strokeWidth={2} />
        ) : (
          <ChevronLeft className="size-3 text-stone-600" strokeWidth={2} />
        )}
      </button>

      {/* Header */}
      <div className="border-b border-stone-100 p-5 pr-6">
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
              wordmarkClassName="text-[21px] text-ink-700"
            />
            <p className="mt-1 truncate text-xs text-stone-500" title={orgName}>
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
      <div className="mt-auto border-t border-stone-100 p-3 pb-3">
        <NavLink
          href={`/app/${orgSlug}/settings?tab=integrations`}
          label="Integrations"
          icon={Plug}
          active={integrationsActive}
          collapsed={collapsed}
        />

        <AccountPopover orgSlug={orgSlug} orgRole={orgRole} collapsed={collapsed} />
      </div>
    </aside>
  );
}
