"use client";

import {
  createContext,
  useContext,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Permission } from "@/lib/authz/permissions";

type EventNavState = {
  eventId: string;
  eventName: string;
  grants: Permission[];
};

const EventNavContext = createContext<{
  event: EventNavState | null;
  setEvent: (event: EventNavState | null) => void;
}>({
  event: null,
  setEvent: () => {},
});

export function EventNavProvider({ children }: { children: ReactNode }) {
  const [event, setEvent] = useState<EventNavState | null>(null);
  const value = useMemo(() => ({ event, setEvent }), [event]);
  return <EventNavContext.Provider value={value}>{children}</EventNavContext.Provider>;
}

export function useEventNav() {
  return useContext(EventNavContext);
}

export function EventNavScope({
  eventId,
  eventName,
  grants,
  children,
}: {
  eventId: string;
  eventName: string;
  grants: Permission[];
  children: ReactNode;
}) {
  const { setEvent } = useEventNav();

  useLayoutEffect(() => {
    setEvent({ eventId, eventName, grants });
  }, [eventId, eventName, grants, setEvent]);

  return children;
}
