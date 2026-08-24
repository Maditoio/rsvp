"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  moderateMeetingRequest,
  setAttendeeMatchmakingPaused,
} from "@/modules/meetings/operations-actions";
import type {
  AttendeeLimitRow,
  ModerationRequestRow,
} from "@/modules/meetings/moderation";
import { Button } from "@/components/ui/button";

export function ModerationTab({
  orgSlug,
  eventId,
  queue,
  limits,
  canManage,
}: {
  orgSlug: string;
  eventId: string;
  queue: ModerationRequestRow[];
  limits: AttendeeLimitRow[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function runModeration(requestId: string, decision: "approve" | "decline" | "approve_schedule") {
    setError(null);
    const fd = new FormData();
    fd.set("requestId", requestId);
    fd.set("decision", decision);
    start(async () => {
      try {
        const result = await moderateMeetingRequest(orgSlug, eventId, fd);
        if (!result.ok) setError(result.error);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Action failed");
      }
    });
  }

  function togglePause(attendeeId: string, paused: boolean) {
    const fd = new FormData();
    fd.set("attendeeId", attendeeId);
    fd.set("paused", paused ? "true" : "false");
    start(async () => {
      await setAttendeeMatchmakingPaused(orgSlug, eventId, fd);
      router.refresh();
    });
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-display text-xl text-slate-900">Request moderation queue</h2>
        <p className="mt-1 text-[0.8125rem] text-slate-500">
          Pending meeting requests awaiting organiser review when moderation is enabled.
        </p>
        {queue.length === 0 ? (
          <p className="mt-4 rounded-xl bg-white px-4 py-8 text-center text-sm text-slate-600 shadow-sm">
            No requests awaiting moderation.
          </p>
        ) : (
          <ul className="mt-4 space-y-3">
            {queue.map((row) => (
              <li key={row.id} className="rounded-xl bg-white p-4 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-slate-900">
                      {row.requesterName}
                      <span className="mx-1.5 text-slate-400">→</span>
                      {row.targetName}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      {[row.requesterCategory, row.targetCategory].filter(Boolean).join(" · ") ||
                        "—"}
                    </p>
                    {row.message ? (
                      <p className="mt-2 text-sm text-slate-600">{row.message}</p>
                    ) : null}
                  </div>
                  {canManage ? (
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        disabled={pending}
                        onClick={() => runModeration(row.id, "approve")}
                      >
                        Approve & notify
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        disabled={pending}
                        onClick={() => runModeration(row.id, "approve_schedule")}
                      >
                        Approve & schedule
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        disabled={pending}
                        onClick={() => runModeration(row.id, "decline")}
                      >
                        Decline
                      </Button>
                    </div>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <h2 className="font-display text-xl text-slate-900">Spam & limits</h2>
        <p className="mt-1 text-[0.8125rem] text-slate-500">
          Attendees near rate limits (20 pending / 50 daily) or with matchmaking paused.
        </p>
        {limits.length === 0 ? (
          <p className="mt-4 text-sm text-slate-600">No attendees flagged.</p>
        ) : (
          <ul className="mt-4 space-y-2">
            {limits.map((row) => (
              <li
                key={row.attendeeId}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white px-4 py-3 shadow-sm"
              >
                <div>
                  <p className="font-medium text-slate-900">{row.name}</p>
                  <p className="text-sm text-slate-500">
                    {row.pendingRequests} pending · {row.dailyRequests} today
                    {row.matchmakingPaused ? " · Paused" : ""}
                  </p>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {row.atPendingLimit ? (
                      <span className="rounded-full bg-danger-bg px-2 py-0.5 text-xs text-danger">
                        Pending limit
                      </span>
                    ) : null}
                    {row.atDailyLimit ? (
                      <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-xs text-amber-800">
                        Daily limit
                      </span>
                    ) : null}
                    {row.matchmakingPaused ? (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                        Matchmaking paused
                      </span>
                    ) : null}
                  </div>
                </div>
                {canManage ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    disabled={pending}
                    onClick={() => togglePause(row.attendeeId, !row.matchmakingPaused)}
                  >
                    {row.matchmakingPaused ? "Resume" : "Pause matchmaking"}
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>

      {error ? <p className="text-sm text-danger">{error}</p> : null}
    </div>
  );
}
