"use client";

import { usePathname } from "next/navigation";
import type { Permission } from "@/lib/authz/permissions";
import { EventPanel } from "@/components/shells/event-panel";
import { EventDayShell } from "@/components/shells/event-day-shell";

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

  if (isEventDay) {
    return (
      <div className="min-w-0 flex-1 overflow-y-auto">
        <EventDayShell orgSlug={orgSlug} eventId={eventId} eventName={eventName}>
          {children}
        </EventDayShell>
      </div>
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
