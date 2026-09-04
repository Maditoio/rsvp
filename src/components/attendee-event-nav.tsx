"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type RefObject,
} from "react";
import { usePathname } from "next/navigation";
import {
  BookUser,
  Calendar,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  GitMerge,
  Handshake,
  IdCard,
  LayoutDashboard,
  ListChecks,
  MapPinned,
  QrCode,
  User,
} from "lucide-react";
import { useAttendeeAttention } from "@/components/attendee-attention-context";
import { isNavActive, parseAttendeeEventId } from "@/components/nav";
import { cn } from "@/lib/utils";

function attendeeEventPrimaryItems(eventId: string) {
  const base = `/me/events/${eventId}`;
  return [
    { href: base, label: "Overview", icon: LayoutDashboard, exact: true },
    { href: `${base}/agenda`, label: "Agenda", icon: CalendarDays },
    { href: `${base}/map`, label: "Map", icon: MapPinned },
    { href: `${base}/directory`, label: "Directory", icon: BookUser },
    { href: `${base}/matchmaking`, label: "Matching", icon: GitMerge },
    { href: `${base}/meetings`, label: "Meetings", icon: Handshake },
    { href: `${base}/polls`, label: "Polls", icon: ListChecks },
    { href: `${base}/calendar`, label: "Calendar", icon: Calendar },
  ];
}

function attendeeEventSecondaryItems(eventId: string) {
  const base = `/me/events/${eventId}`;
  return [
    { href: `${base}/profile`, label: "Profile", icon: User },
    { href: `${base}/qr`, label: "Check-in", icon: QrCode },
    { href: `${base}/badge`, label: "Badge", icon: IdCard },
  ];
}

function isProfileSectionActive(pathname: string, eventId: string) {
  const base = `/me/events/${eventId}`;
  return (
    pathname === `${base}/profile` ||
    pathname.startsWith(`${base}/privacy`) ||
    pathname.startsWith(`${base}/matchmaking`)
  );
}

function useHorizontalOverflow(ref: RefObject<HTMLElement | null>) {
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const update = useCallback(() => {
    const el = ref.current;
    if (!el) {
      setCanScrollLeft(false);
      setCanScrollRight(false);
      return;
    }
    const max = el.scrollWidth - el.clientWidth;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(max > 4 && el.scrollLeft < max - 4);
  }, [ref]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    update();
    el.addEventListener("scroll", update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    window.addEventListener("resize", update);
    return () => {
      el.removeEventListener("scroll", update);
      ro.disconnect();
      window.removeEventListener("resize", update);
    };
  }, [ref, update]);

  return { canScrollLeft, canScrollRight, update };
}

function ScrollableNavRow({
  children,
  "aria-label": ariaLabel,
  className,
  scrollerClassName,
}: {
  children: React.ReactNode;
  "aria-label": string;
  className?: string;
  scrollerClassName?: string;
}) {
  const scrollerRef = useRef<HTMLElement>(null);
  const { canScrollLeft, canScrollRight } = useHorizontalOverflow(scrollerRef);

  const scrollByPage = (direction: -1 | 1) => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollBy({
      left: direction * Math.max(120, el.clientWidth * 0.7),
      behavior: "smooth",
    });
  };

  return (
    <div className={cn("relative min-w-0", className)}>
      {canScrollLeft ? (
        <>
          <div
            className="pointer-events-none absolute inset-y-0 left-0 z-10 w-8 bg-gradient-to-r from-white to-transparent"
            aria-hidden
          />
          <button
            type="button"
            onClick={() => scrollByPage(-1)}
            className="absolute left-0 top-1/2 z-20 flex size-8 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm hover:bg-slate-50"
            aria-label="Scroll navigation left"
          >
            <ChevronLeft className="size-4" strokeWidth={2} aria-hidden />
          </button>
        </>
      ) : null}
      {canScrollRight ? (
        <>
          <div
            className="pointer-events-none absolute inset-y-0 right-0 z-10 w-10 bg-gradient-to-l from-white to-transparent"
            aria-hidden
          />
          <button
            type="button"
            onClick={() => scrollByPage(1)}
            className="absolute right-0 top-1/2 z-20 flex size-8 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm hover:bg-slate-50"
            aria-label="Scroll navigation right"
          >
            <ChevronRight className="size-4" strokeWidth={2} aria-hidden />
          </button>
        </>
      ) : null}
      <nav
        ref={scrollerRef}
        className={cn(
          "flex gap-0 overflow-x-auto scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
          scrollerClassName,
        )}
        aria-label={ariaLabel}
      >
        {children}
      </nav>
    </div>
  );
}

export function AttendeeEventNav({ eventId }: { eventId: string }) {
  const pathname = usePathname();
  const { inbox } = useAttendeeAttention();
  const pendingMeetings = inbox?.pendingRequestCount ?? 0;
  const primary = attendeeEventPrimaryItems(eventId);
  const secondary = attendeeEventSecondaryItems(eventId);

  return (
    <div className="border-t border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 sm:px-6 sm:flex-row sm:items-center sm:justify-between">
        <ScrollableNavRow
          aria-label="Event sections"
          className="min-w-0 flex-1"
          scrollerClassName="-mx-1"
        >
          {primary.map((item) => {
            const active = isNavActive(pathname, item.href, item.exact);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "relative inline-flex shrink-0 items-center gap-2 px-3 py-3.5 text-sm transition-colors",
                  active
                    ? "font-semibold text-indigo-700"
                    : "text-slate-600 hover:text-slate-900",
                )}
              >
                <Icon className="size-4 shrink-0" strokeWidth={1.75} aria-hidden />
                {item.label}
                {item.href.endsWith("/meetings") && pendingMeetings > 0 ? (
                  <span className="ml-1 inline-flex min-w-[1.125rem] items-center justify-center rounded-full bg-indigo-600 px-1.5 text-[0.6875rem] font-semibold tabular-nums text-white">
                    {pendingMeetings > 9 ? "9+" : pendingMeetings}
                  </span>
                ) : null}
                {active ? (
                  <span
                    className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-indigo-600"
                    aria-hidden
                  />
                ) : null}
              </Link>
            );
          })}
        </ScrollableNavRow>
        <nav
          className="hidden items-center gap-1 pb-2 sm:flex sm:pb-0"
          aria-label="Account for this event"
        >
          {secondary.map((item) => {
            const active =
              item.href.endsWith("/profile")
                ? isProfileSectionActive(pathname, eventId)
                : isNavActive(pathname, item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700",
                  active && "bg-slate-100 text-slate-700",
                )}
              >
                <Icon className="size-3.5" strokeWidth={1.75} aria-hidden />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
      {/* Mobile secondary */}
      <div className="border-t border-slate-100 px-4 py-2 sm:hidden">
        <ScrollableNavRow
          aria-label="More for this event"
          scrollerClassName="gap-1"
        >
          {secondary.map((item) => {
            const active =
              item.href.endsWith("/profile")
                ? isProfileSectionActive(pathname, eventId)
                : isNavActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "shrink-0 rounded-full px-2.5 py-1 text-xs text-slate-600",
                  active && "bg-slate-100 font-medium text-slate-700",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </ScrollableNavRow>
      </div>
    </div>
  );
}

export function AttendeeEventNavFromPath() {
  const pathname = usePathname();
  const eventId = parseAttendeeEventId(pathname);
  if (!eventId) return null;
  return <AttendeeEventNav eventId={eventId} />;
}
