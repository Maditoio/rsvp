"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { markMeetingNoShow } from "@/modules/meetings/operations-actions";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import { cn } from "@/lib/utils";

type TodayMeeting = {
  id: string;
  status: string;
  when: string;
  room: string | null;
  participants: {
    name: string;
    company: string | null;
    checkInStatus: string;
  }[];
};

export function TodayMeetingsTab({
  orgSlug,
  eventId,
  meetings,
  canManage,
}: {
  orgSlug: string;
  eventId: string;
  meetings: TodayMeeting[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  function handleNoShow(meetingId: string, freeSlot: boolean) {
    const fd = new FormData();
    fd.set("meetingId", meetingId);
    if (freeSlot) fd.set("freeSlot", "on");
    start(async () => {
      await markMeetingNoShow(orgSlug, eventId, fd);
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-display text-xl text-slate-900">Today&apos;s meetings</h2>
        <p className="mt-1 text-[0.8125rem] text-slate-500">
          Event-day command centre — participants, rooms, times, and check-in status.
        </p>
      </div>

      {meetings.length === 0 ? (
        <p className="rounded-xl bg-white px-4 py-8 text-center text-sm text-slate-600 shadow-sm">
          No meetings scheduled for today.
        </p>
      ) : (
        <ul className="space-y-3">
          {meetings.map((m) => (
            <li key={m.id} className="rounded-xl bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-slate-900">{m.when}</span>
                    {m.room ? (
                      <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-slate-600">
                        {m.room}
                      </span>
                    ) : null}
                    <StatusBadge status={m.status} />
                  </div>
                  <ul className="mt-3 space-y-2">
                    {m.participants.map((p) => (
                      <li key={p.name} className="flex flex-wrap items-center gap-2 text-sm">
                        <span className="font-medium text-slate-800">{p.name}</span>
                        {p.company ? (
                          <span className="text-slate-500">{p.company}</span>
                        ) : null}
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 text-xs font-medium",
                            p.checkInStatus === "CHECKED_IN"
                              ? "bg-emerald-50 text-success"
                              : "bg-slate-100 text-slate-500",
                          )}
                        >
                          {p.checkInStatus === "CHECKED_IN" ? "Checked in" : "Not checked in"}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
                {canManage && m.status === "SCHEDULED" ? (
                  <div className="flex flex-col gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      disabled={pending}
                      onClick={() => handleNoShow(m.id, false)}
                    >
                      Mark no-show
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      disabled={pending}
                      onClick={() => handleNoShow(m.id, true)}
                    >
                      No-show & free slot
                    </Button>
                  </div>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
