"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from "react";
import { usePathname } from "next/navigation";
import { parseAttendeeEventId } from "@/components/nav";
import { fetchAttendeeInbox } from "@/modules/notifications/actions";
import type { AttendeeInbox } from "@/modules/notifications/attendee-inbox";

type AttendeeAttentionContextValue = {
  eventId: string | null;
  inbox: AttendeeInbox | null;
  loading: boolean;
  refresh: () => void;
};

const emptyInbox: AttendeeInbox = {
  notifications: [],
  pendingRequests: [],
  unreadNotificationCount: 0,
  pendingRequestCount: 0,
  badgeCount: 0,
};

const AttendeeAttentionContext = createContext<AttendeeAttentionContextValue>({
  eventId: null,
  inbox: null,
  loading: false,
  refresh: () => undefined,
});

export function AttendeeAttentionProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const eventId = parseAttendeeEventId(pathname);
  const [inbox, setInbox] = useState<AttendeeInbox | null>(null);
  const [loading, start] = useTransition();

  const refresh = useCallback(() => {
    start(async () => {
      const result = await fetchAttendeeInbox(eventId ?? undefined);
      if (result.ok) setInbox(result.data);
    });
  }, [eventId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const value = useMemo(
    () => ({
      eventId,
      inbox: inbox ?? emptyInbox,
      loading,
      refresh,
    }),
    [eventId, inbox, loading, refresh],
  );

  return (
    <AttendeeAttentionContext.Provider value={value}>
      {children}
    </AttendeeAttentionContext.Provider>
  );
}

export function useAttendeeAttention() {
  return useContext(AttendeeAttentionContext);
}
