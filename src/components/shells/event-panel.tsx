"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { ChevronDown, Menu, X } from "lucide-react";
import { hasPermission, type Permission } from "@/lib/authz/permissions";
import {
  eventNavGroups,
  eventSettingsItem,
  isNavActive,
} from "@/components/nav";
import { NavLink } from "@/components/nav-link";

function PanelContent({
  orgSlug,
  eventId,
  eventName,
  grants,
  onNavigate,
}: {
  orgSlug: string;
  eventId: string;
  eventName: string;
  grants: Permission[];
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

  return (
    <>
      {/* Event switcher */}
      <div className="p-4">
        <div className="flex items-center justify-between rounded-sm border border-stone-300 bg-white px-[10px] py-[9px] focus-within:border-ink-700 focus-within:shadow-[0_0_0_3px_rgba(31,41,55,0.12)]">
          <div className="min-w-0">
            <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.06em] text-bronze-500">
              Current event
            </p>
            <p className="truncate text-[0.9375rem] font-semibold text-ink-700">
              {eventName}
            </p>
          </div>
          <ChevronDown className="size-[15px] shrink-0 text-stone-500" strokeWidth={1.75} />
        </div>
      </div>

      {/* Grouped nav */}
      <nav className="flex-1 overflow-y-auto px-3" onClick={onNavigate}>
        {groups.map((group) => {
          const visible = group.items.filter((item) =>
            hasPermission(grants, item.permission),
          );
          if (visible.length === 0) return null;
          return (
            <div key={group.label} className="mb-4">
              <p className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-stone-400">
                {group.label}
              </p>
              <div className="flex flex-col gap-0.5">
                {visible.map((item) => (
                  <NavLink
                    key={item.href}
                    href={item.href}
                    label={item.label}
                    icon={item.icon}
                    active={isNavActive(pathname, item.href, item.exact)}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </nav>

      {/* Event settings pinned at bottom */}
      {hasPermission(grants, settingsItem.permission) && (
        <div className="border-t border-stone-200 px-3 pb-4 pt-[10px]" onClick={onNavigate}>
          <NavLink
            href={settingsItem.href}
            label={settingsItem.label}
            icon={settingsItem.icon}
            active={isNavActive(pathname, settingsItem.href)}
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
  const pathname = usePathname();

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
        <button
          type="button"
          onClick={() => setOverlayOpen(true)}
          className="fixed bottom-4 left-4 z-30 flex size-10 items-center justify-center rounded-sm border border-stone-300 bg-white shadow-md md:hidden lg:hidden"
          title="Open event navigation"
          style={{ display: "none" }}
        >
          <Menu className="size-5 text-ink-700" strokeWidth={1.75} />
        </button>

        {/* Tablet overlay trigger — shown as a thin strip */}
        <button
          type="button"
          onClick={() => setOverlayOpen(true)}
          className="hidden h-screen w-10 shrink-0 items-center justify-center border-r border-stone-200 bg-stone-50 hover:bg-stone-100 md:flex"
          title="Open event navigation"
        >
          <Menu className="size-4 text-stone-500" strokeWidth={1.75} />
        </button>

        {overlayOpen && (
          <div className="fixed inset-0 z-40">
            <button
              type="button"
              className="absolute inset-0 bg-ink-900/30"
              onClick={closeOverlay}
              aria-label="Close event navigation"
            />
            <aside
              className="absolute inset-y-0 left-0 flex w-[264px] flex-col shadow-lg md:left-16"
              style={{ background: "#FBFAF8" }}
            >
              <div className="flex items-center justify-end p-2">
                <button
                  type="button"
                  onClick={closeOverlay}
                  className="rounded-sm p-1 text-stone-500 hover:bg-stone-100"
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

  // Desktop: permanent panel
  return (
    <aside
      className="hidden h-screen w-[264px] shrink-0 flex-col border-r border-stone-200 md:flex"
      style={{ background: "#FBFAF8" }}
    >
      <PanelContent
        orgSlug={orgSlug}
        eventId={eventId}
        eventName={eventName}
        grants={grants}
      />
    </aside>
  );
}
