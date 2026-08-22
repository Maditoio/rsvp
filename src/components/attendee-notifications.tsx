"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { Bell, Check, X } from "lucide-react";
import { useAttendeeAttention } from "@/components/attendee-attention-context";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { respondToMeeting } from "@/modules/meetings/actions";
import {
  markAllInboxNotificationsRead,
  markInboxNotificationsViewed,
} from "@/modules/notifications/actions";
import { useToast } from "@/components/ui/toast";

function formatWhen(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

export function AttendeeNotifications() {
  const router = useRouter();
  const toast = useToast();
  const { eventId, inbox, refresh } = useAttendeeAttention();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const ref = useRef<HTMLDivElement>(null);

  const badgeCount = inbox?.badgeCount ?? 0;
  const meetingsHref = eventId ? `/me/events/${eventId}/meetings` : "/me";

  useEffect(() => {
    if (!open) return;
    const unreadIds =
      inbox?.notifications.filter((row) => !row.readAt).map((row) => row.id) ?? [];
    if (unreadIds.length === 0) return;

    void markInboxNotificationsViewed(unreadIds, eventId ?? undefined).then((result) => {
      if (result.ok) refresh();
    });
  }, [open, inbox?.notifications, eventId, refresh]);

  useEffect(() => {
    if (!open) return;
    function onClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function respond(requestId: string, decision: "accept" | "decline") {
    if (!eventId) return;
    start(async () => {
      const formData = new FormData();
      formData.set("requestId", requestId);
      formData.set("decision", decision);
      formData.set("autoSchedule", decision === "accept" ? "on" : "");
      const result = await respondToMeeting(eventId, formData);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(
        decision === "accept"
          ? "Connection accepted. A meeting has been created."
          : "Connection request declined.",
      );
      refresh();
      router.refresh();
    });
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="relative inline-flex size-9 items-center justify-center rounded-sm text-stone-600 transition-colors hover:bg-stone-100 hover:text-ink-800"
        aria-expanded={open}
        aria-label={
          badgeCount > 0
            ? `Notifications, ${badgeCount} unread`
            : "Notifications"
        }
      >
        <Bell className="size-4" strokeWidth={1.75} aria-hidden />
        {badgeCount > 0 ? (
          <span className="absolute -right-0.5 -top-0.5 flex min-w-[1.125rem] items-center justify-center rounded-xs bg-bronze-600 px-1 text-[0.625rem] font-semibold leading-none text-white">
            {badgeCount > 9 ? "9+" : badgeCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 z-50 mt-2 w-[min(22rem,calc(100vw-2rem))] rounded-md border border-stone-200 bg-stone-0 shadow-lg">
          <div className="flex items-center justify-between border-b border-stone-200 px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-ink-800">Notifications</p>
              <p className="text-xs text-stone-500">
                {eventId ? "For this event" : "Across your events"}
              </p>
            </div>
            {inbox && inbox.unreadNotificationCount > 0 ? (
              <button
                type="button"
                className="text-xs font-medium text-bronze-700 hover:text-bronze-800"
                onClick={() => {
                  start(async () => {
                    const result = await markAllInboxNotificationsRead(
                      eventId ?? undefined,
                    );
                    if (result.ok) refresh();
                  });
                }}
              >
                Mark all read
              </button>
            ) : null}
          </div>

          <div className="max-h-[min(24rem,60vh)] overflow-y-auto">
            {inbox && inbox.pendingRequests.length > 0 ? (
              <section className="border-b border-stone-200 px-4 py-3">
                <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.06em] text-bronze-600">
                  Connection requests
                </p>
                <ul className="mt-2 space-y-3">
                  {inbox.pendingRequests.map((request) => (
                    <li
                      key={request.id}
                      className="rounded-sm border border-bronze-200 bg-bronze-50 px-3 py-3"
                    >
                      <p className="text-sm font-semibold text-ink-800">
                        {request.requesterName}
                      </p>
                      {request.requesterCompany ? (
                        <p className="text-xs text-stone-600">
                          {request.requesterCompany}
                        </p>
                      ) : null}
                      {request.message ? (
                        <p className="mt-2 text-sm text-stone-700">{request.message}</p>
                      ) : null}
                      <p className="mt-1 text-xs text-stone-500">
                        {formatWhen(request.createdAt)}
                      </p>
                      <div className="mt-3 flex gap-2">
                        <Button
                          type="button"
                          size="sm"
                          disabled={pending}
                          onClick={() => respond(request.id, "accept")}
                        >
                          <Check className="size-3.5" aria-hidden />
                          Accept
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          disabled={pending}
                          onClick={() => respond(request.id, "decline")}
                        >
                          <X className="size-3.5" aria-hidden />
                          Decline
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {inbox && inbox.notifications.length > 0 ? (
              <ul className="divide-y divide-stone-100 px-4 py-2">
                {inbox.notifications.map((row) => (
                  <li
                    key={row.id}
                    className={cn(
                      "py-3",
                      !row.readAt && "border-l-[3px] border-bronze-500 pl-3",
                    )}
                  >
                    <p className="text-sm font-medium text-ink-800">{row.title}</p>
                    <p className="mt-1 text-sm text-stone-700">{row.body}</p>
                    <p className="mt-1 text-xs text-stone-500">
                      {row.eventName ? `${row.eventName} · ` : ""}
                      {formatWhen(row.createdAt)}
                    </p>
                  </li>
                ))}
              </ul>
            ) : null}

            {inbox &&
            inbox.pendingRequests.length === 0 &&
            inbox.notifications.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-stone-600">
                No notifications yet.
              </p>
            ) : null}
          </div>

          {eventId ? (
            <div className="border-t border-stone-200 px-4 py-3">
              <Link
                href={meetingsHref}
                className="text-sm font-semibold text-ink-700 underline-offset-4 hover:underline"
                onClick={() => setOpen(false)}
              >
                Open meetings
              </Link>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
