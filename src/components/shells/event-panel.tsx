"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { Calendar, ChevronLeft, ChevronRight, Menu, X } from "lucide-react";
import { hasPermission, type Permission } from "@/lib/authz/permissions";
import {
  eventNavGroups,
  eventSettingsItem,
  isNavActive,
} from "@/components/nav";
import { NavLink } from "@/components/nav-link";
import { setOrgRailCollapsed } from "@/components/shells/org-rail";
import { cn } from "@/lib/utils";

/* ── Persisted collapse state ── */

const STORAGE_KEY = "delegate.eventPanelCollapsed";
const listeners = new Set<() => void>();

function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

function readCollapsed() {
  return window.localStorage.getItem(STORAGE_KEY) === "1";
}

/** Collapse/expand the event panel (sidenav 2). */
export function setEventPanelCollapsed(collapsed: boolean) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, collapsed ? "1" : "0");
  listeners.forEach((fn) => fn());
}

export function useEventPanelCollapsed() {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    setCollapsed(readCollapsed());
    const onChange = () => setCollapsed(readCollapsed());
    return subscribe(onChange);
  }, []);

  const toggle = useCallback(() => {
    setEventPanelCollapsed(!collapsed);
  }, [collapsed]);

  return [collapsed, toggle] as const;
}

function collapseOrgRail() {
  setOrgRailCollapsed(true);
}

function PanelContent({
  orgSlug,
  eventId,
  eventName,
  grants,
  collapsed = false,
  onNavigate,
}: {
  orgSlug: string;
  eventId: string;
  eventName: string;
  grants: Permission[];
  collapsed?: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const groups = useMemo(
    () => eventNavGroups(orgSlug, eventId),
    [orgSlug, eventId],
  );
  const settingsItem = useMemo(
    () => eventSettingsItem(orgSlug, eventId),
    [orgSlug, eventId],
  );
  const eventOverviewHref = `/app/${orgSlug}/events/${eventId}`;

  return (
    <>
      {/* Event switcher */}
      <div className={cn("p-4", collapsed && "px-2 py-4")}>
        {collapsed ? (
          <Link
            href={eventOverviewHref}
            onClick={onNavigate}
            title={eventName}
            className="mx-auto flex size-[38px] items-center justify-center rounded-full bg-white text-indigo-600 shadow-sm shadow-xs transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-500/12"
          >
            <Calendar className="size-4" strokeWidth={1.75} aria-hidden />
            <span className="sr-only">{eventName}</span>
          </Link>
        ) : (
          <Link
            href={eventOverviewHref}
            onClick={onNavigate}
            className="flex items-center rounded-xl bg-white px-[14px] py-[10px] shadow-sm shadow-xs transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-500/12"
          >
            <div className="min-w-0">
              <p className="text-label text-indigo-600">Current event</p>
              <p className="truncate text-[0.9375rem] font-semibold text-slate-900">
                {eventName}
              </p>
            </div>
          </Link>
        )}
      </div>

      {/* Grouped nav */}
      <nav
        id="event-panel-nav"
        className={cn(
          "flex-1 overflow-y-auto",
          collapsed ? "px-2" : "px-3",
        )}
        onClick={onNavigate}
        aria-label="Event navigation"
      >
        {groups.map((group) => {
          const visible = group.items.filter((item) =>
            hasPermission(grants, item.permission),
          );
          if (visible.length === 0) return null;
          return (
            <div key={group.label} className="mb-4">
              {!collapsed && (
                <p className="mb-1 px-2 text-label text-slate-400">
                  {group.label}
                </p>
              )}
              <div className="flex flex-col gap-0.5">
                {visible.map((item) => (
                  <NavLink
                    key={item.href}
                    href={item.href}
                    label={item.label}
                    icon={item.icon}
                    active={isNavActive(pathname, item.href, item.exact)}
                    collapsed={collapsed}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </nav>

      {/* Event settings pinned at bottom */}
      {hasPermission(grants, settingsItem.permission) && (
        <div
          className={cn(
            "border-t border-slate-200 pb-4 pt-[10px]",
            collapsed ? "px-2" : "px-3",
          )}
          onClick={onNavigate}
        >
          <NavLink
            href={settingsItem.href}
            label={settingsItem.label}
            icon={settingsItem.icon}
            active={isNavActive(pathname, settingsItem.href)}
            collapsed={collapsed}
          />
        </div>
      )}
    </>
  );
}

export function EventPanel({
  orgSlug,
  eventId,
  eventName,
  grants,
}: {
  orgSlug: string;
  eventId: string;
  eventName: string;
  grants: Permission[];
}) {
  const [overlayOpen, setOverlayOpen] = useState(false);
  const [isOverlayMode, setIsOverlayMode] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [collapsed, toggle] = useEventPanelCollapsed();
  const pathname = usePathname();
  const showCollapsed = mounted && collapsed;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const check = () => setIsOverlayMode(window.innerWidth < 900);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Close overlay on navigation
  useEffect(() => {
    setOverlayOpen(false);
  }, [pathname]);

  const closeOverlay = useCallback(() => setOverlayOpen(false), []);

  // Hidden on mobile (<640px) — mobile drawer handles it
  // Overlay mode (640–899px)
  if (isOverlayMode) {
    return (
      <>
        {/* Tablet overlay trigger — shown as a thin strip */}
        <button
          type="button"
          onClick={() => {
            collapseOrgRail();
            setOverlayOpen(true);
          }}
          className="hidden h-screen w-10 shrink-0 items-center justify-center border-r border-slate-200 bg-slate-50 hover:bg-slate-100 md:flex"
          title="Open event navigation"
        >
          <Menu className="size-4 text-slate-500" strokeWidth={1.75} />
        </button>

        {overlayOpen && (
          <div className="fixed inset-0 z-40">
            <button
              type="button"
              className="absolute inset-0 bg-slate-900/40"
              onClick={closeOverlay}
              aria-label="Close event navigation"
            />
            <aside className="absolute inset-y-0 left-0 flex w-[264px] flex-col overflow-y-auto overflow-x-hidden bg-white shadow-lg md:left-16">
              <div className="flex items-center justify-end p-2">
                <button
                  type="button"
                  onClick={closeOverlay}
                  className="rounded-full p-1 text-slate-500 hover:bg-slate-100"
                >
                  <X className="size-4" strokeWidth={1.75} />
                </button>
              </div>
              <PanelContent
                orgSlug={orgSlug}
                eventId={eventId}
                eventName={eventName}
                grants={grants}
                onNavigate={closeOverlay}
              />
            </aside>
          </div>
        )}
      </>
    );
  }

  // Desktop: permanent panel (collapsible)
  return (
    <aside
      className={cn(
        "relative hidden h-full shrink-0 flex-col overflow-y-auto overflow-x-hidden bg-white shadow-[2px_0_12px_rgba(15,23,42,0.03)] transition-[width] duration-[220ms] ease-out md:flex motion-reduce:transition-none",
        showCollapsed ? "w-16" : "w-[264px]",
      )}
      style={{ willChange: "width" }}
    >
      <button
        type="button"
        onClick={toggle}
        aria-expanded={!showCollapsed}
        aria-controls="event-panel-nav"
        aria-label={showCollapsed ? "Expand event sidebar" : "Collapse event sidebar"}
        title={showCollapsed ? "Expand event sidebar" : "Collapse event sidebar"}
        className={cn(
          "absolute -right-[18px] top-5 z-10 inline-flex size-9 items-center justify-center rounded-full",
          "bg-white text-slate-500 shadow-md",
          "transition-[color,background-color,box-shadow,transform] duration-150 ease-out",
          "hover:bg-indigo-50 hover:text-indigo-600 hover:shadow-accent",
          "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-500/12",
          "active:scale-95",
        )}
      >
        {showCollapsed ? (
          <ChevronRight className="size-4" strokeWidth={2} />
        ) : (
          <ChevronLeft className="size-4" strokeWidth={2} />
        )}
      </button>

      <PanelContent
        orgSlug={orgSlug}
        eventId={eventId}
        eventName={eventName}
        grants={grants}
        collapsed={showCollapsed}
      />
    </aside>
  );
}
