"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Sparkles, Users } from "lucide-react";
import { preSchedulePairing } from "@/modules/meetings/operations-actions";
import type { PairingDetail } from "@/modules/matchmaking/pairing-detail";
import { Button } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";
import { cn } from "@/lib/utils";

export function PairingInsightDrawer({
  orgSlug,
  eventId,
  subjectId,
  candidateId,
  open,
  onClose,
  canManage,
}: {
  orgSlug: string;
  eventId: string;
  subjectId: string | null;
  candidateId: string | null;
  open: boolean;
  onClose: () => void;
  canManage: boolean;
}) {
  const router = useRouter();
  const [detail, setDetail] = useState<PairingDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  useEffect(() => {
    if (!open || !subjectId || !candidateId) {
      setDetail(null);
      return;
    }
    let cancelled = false;
    fetch(
      `/app/${orgSlug}/events/${eventId}/meetings/pairing-detail?subjectId=${subjectId}&candidateId=${candidateId}`,
    )
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) setDetail(data);
      })
      .catch(() => {
        if (!cancelled) setError("Could not load pairing detail.");
      });
    return () => {
      cancelled = true;
    };
  }, [open, orgSlug, eventId, subjectId, candidateId]);

  function schedulePairing() {
    if (!subjectId || !candidateId) return;
    setError(null);
    const fd = new FormData();
    fd.set("subjectId", subjectId);
    fd.set("candidateId", candidateId);
    start(async () => {
      try {
        const result = await preSchedulePairing(orgSlug, eventId, fd);
        if (!result.ok) {
          setError(result.error);
          return;
        }
        onClose();
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not schedule");
      }
    });
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Why this match?"
      description="Structured reasons and AI insight for this pairing."
      size="md"
    >
      {!detail ? (
        <p className="text-sm text-slate-500">Loading…</p>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-slate-900">
            <Users className="size-4 text-slate-400" />
            <span className="font-medium">
              {detail.subjectName} ↔ {detail.candidateName}
            </span>
            {detail.bandLabel ? (
              <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700">
                {detail.bandLabel}
              </span>
            ) : null}
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Structured reasons
            </p>
            <ul className="mt-2 space-y-1.5">
              {detail.reasons.labels.length > 0 ? (
                detail.reasons.labels.map((label) => (
                  <li
                    key={label}
                    className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700"
                  >
                    {label}
                  </li>
                ))
              ) : (
                <li className="text-sm text-slate-500">Score based on profile overlap.</li>
              )}
            </ul>
          </div>

          {detail.aiInsight ? (
            <div className="rounded-xl bg-indigo-50/80 p-4">
              <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-indigo-700">
                <Sparkles className="size-3.5" />
                AI insight
              </p>
              <p className="mt-2 text-sm text-indigo-900">{detail.aiInsight}</p>
            </div>
          ) : null}

          <p className="text-xs text-slate-400 tabular-nums">
            Structured score {Math.round(detail.structuredScore)} · Rank{" "}
            {Math.round(detail.rankScore)}
          </p>

          {canManage && !detail.hasExistingMeeting ? (
            <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
              <Button type="button" variant="secondary" onClick={onClose}>
                Close
              </Button>
              <Button type="button" disabled={pending} onClick={schedulePairing}>
                {pending ? "Scheduling…" : "Pre-schedule meeting"}
              </Button>
            </div>
          ) : null}

          {detail.hasExistingMeeting ? (
            <p className="text-sm text-success">These attendees already have a meeting.</p>
          ) : null}
          {error ? <p className="text-sm text-danger">{error}</p> : null}
        </div>
      )}
    </Drawer>
  );
}
