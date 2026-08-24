"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import type { Permission } from "@/lib/authz/permissions";
import { EventPanel } from "@/components/shells/event-panel";
import { EventDayShell } from "@/components/shells/event-day-shell";
import { setOrgRailCollapsed } from "@/components/shells/org-rail";

export function EventLayoutFrame({
  orgSlug,
  eventId,
  eventName,
  grants,
  children,
}: {
  orgSlug: string;
  eventId: string;
  eventName: string;
  grants: Permission[];
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const eventDayPrefix = `/app/${orgSlug}/events/${eventId}/day`;
  const isEventDay =
    pathname === eventDayPrefix || pathname.startsWith(`${eventDayPrefix}/`);
  const isBadgePrint = pathname.includes(`/events/${eventId}/badges/print`);

  // Collapse org rail when entering an event workspace (not on every panel click).
  useEffect(() => {
    if (!isEventDay && !isBadgePrint) {
      setOrgRailCollapsed(true);
    }
  }, [eventId, isEventDay, isBadgePrint]);

  if (isEventDay) {
    return (
      <div className="min-w-0 flex-1 overflow-y-auto">
        <EventDayShell orgSlug={orgSlug} eventId={eventId} eventName={eventName}>
          {children}
        </EventDayShell>
      </div>
    );
  }

  if (isBadgePrint) {
    return (
      <div className="min-w-0 flex-1 overflow-y-auto bg-slate-50">{children}</div>
    );
  }

  return (
    <>
      <EventPanel
        orgSlug={orgSlug}
        eventId={eventId}
        eventName={eventName}
        grants={grants}
      />
      <main className="min-w-0 flex-1 overflow-y-auto p-6 md:p-10">{children}</main>
    </>
  );
}
